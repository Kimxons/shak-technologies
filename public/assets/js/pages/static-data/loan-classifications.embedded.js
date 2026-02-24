document.addEventListener('DOMContentLoaded', function() {
    console.log('[LoanClassifications] Initializing...');
    
    // =========================================
    // SIDEBAR TOGGLE FUNCTIONALITY
    // =========================================
    const sidebar = document.getElementById('main-sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            sidebar.classList.toggle('collapsed');
            const isCollapsed = sidebar.classList.contains('collapsed');
            
            // Update aria-expanded
            sidebarToggle.setAttribute('aria-expanded', !isCollapsed);
            
            // Update toggle icon
            const icon = sidebarToggle.querySelector('i');
            if (icon) {
                icon.classList.remove('bi-list', 'bi-x-lg');
                icon.classList.add(isCollapsed ? 'bi-list' : 'bi-x-lg');
            }
            
            console.log('[LoanClassifications] Sidebar toggled:', isCollapsed ? 'collapsed' : 'expanded');
        });
    }
    
    // =========================================
    // NAV SECTION TOGGLE (Data Entry, etc.)
    // =========================================
    const navHeaders = document.querySelectorAll('.nav-header--card');
    
    navHeaders.forEach(function(header) {
        header.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const section = header.closest('.nav-section--card');
            if (!section) return;
            
            // Toggle expanded class
            section.classList.toggle('expanded');
            const isExpanded = section.classList.contains('expanded');
            
            // Toggle nav items visibility
            const items = section.querySelector('.nav-items--card');
            if (items) {
                items.classList.toggle('is-visible', isExpanded);
            }
            
            // Update arrow icon
            const arrow = header.querySelector('.nav-arrow--card');
            if (arrow) {
                arrow.setAttribute('aria-expanded', isExpanded);
                const icon = arrow.querySelector('i');
                if (icon) {
                    icon.classList.remove('bi-chevron-down', 'bi-chevron-up');
                    icon.classList.add(isExpanded ? 'bi-chevron-up' : 'bi-chevron-down');
                }
            }
            
            console.log('[LoanClassifications] Nav section toggled:', isExpanded ? 'expanded' : 'collapsed');
        });
    });
    
    // =========================================
    // FORM SECTION TOGGLE (Classification Details, Behind the Scene)
    // =========================================
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
            
            console.log('[LoanClassifications] Section toggled:', section.dataset.section, isCollapsed ? 'collapsed' : 'expanded');
        });
    });
    
    // =========================================
    // SIDEBAR ITEM CLICK (Open Sub-Modal)
    // =========================================
    const sidebarItems = document.querySelectorAll('.sidebar-item[data-bs-toggle="modal"]');
    
    sidebarItems.forEach(function(item) {
        item.addEventListener('click', function(e) {
            // Don't prevent default - let Bootstrap handle the modal
            console.log('[LoanClassifications] Opening sub-modal:', item.dataset.bsTarget);
        });
    });
    
    // =========================================
    // MESSAGE HANDLER FROM SUB-MODAL IFRAMES
    // =========================================
    window.addEventListener('message', function(event) {
        if (!event.data || typeof event.data !== 'object') return;
        
        const { type, modalId, maximize } = event.data;
        
        switch (type) {
            case 'submoduleClosed':
                // Close the specified modal
                const modalToClose = document.getElementById(modalId);
                if (modalToClose) {
                    const bsModal = bootstrap.Modal.getInstance(modalToClose);
                    if (bsModal) {
                        bsModal.hide();
                    }
                }
                break;
                
            case 'toggleSidebarForMaximize':
                // Toggle sidebar collapse when sub-modal is maximized
                if (sidebar) {
                    if (maximize) {
                        sidebar.classList.add('collapsed');
                    }
                }
                break;
                
            case 'submoduleOpened':
                console.log('[LoanClassifications] Sub-module opened:', modalId);
                break;
        }
    });
    
    console.log('[LoanClassifications] Initialization complete');
});
