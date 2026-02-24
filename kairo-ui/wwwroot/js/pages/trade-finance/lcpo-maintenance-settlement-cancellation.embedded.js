// Navigation toggle functionality
        document.querySelectorAll('.nav-toggle').forEach(toggle => {
            toggle.addEventListener('click', function() {
                this.classList.toggle('collapsed');
                const navItems = this.nextElementSibling;
                if (navItems && navItems.classList.contains('nav-items')) {
                    navItems.classList.toggle('collapsed');
                }
            });
        });

        // Navigation item click - open screens as separate modals
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                const sectionId = this.getAttribute('data-section');
                
                // Map section IDs to modal IDs
                const modalMap = {
                    'lc-extension': 'lcpoExtensionModal',
                    'lc-cancellation': 'lcpoCancellationModal',
                    'messages': 'lcpoMessagesModal',
                    'discrepancies': 'lcpoDiscrepanciesModal',
                    'availment': 'lcpoAvailmentModal',
                    'lc-portfolio': 'lcpoPortfolioModal'
                };
                
                const modalId = modalMap[sectionId];
                if (modalId) {
                    if (window.top && window.top !== window) {
                        window.top.postMessage({
                            action: 'openModal',
                            modalId
                        }, '*');
                    } else if (window.parent && window.parent !== window) {
                        window.parent.postMessage({
                            action: 'openModal',
                            modalId
                        }, '*');
                    }
                }
            });
        });
