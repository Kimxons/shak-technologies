/**
 * Submodule Window Controls - Shared Script
 * Handles window controls for all Account Maintenance submodules
 * Per UI Guidelines: NO duplicate scripts in partial views
 */

(function() {
    'use strict';

    /**
     * Notify parent when submodule opens
     */
    function notifyParentFormOpened(moduleName) {
        try {
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({ 
                    action: 'submoduleOpened',
                    source: moduleName
                }, '*');
            }
        } catch (error) {
            console.error('[WindowControls] Error notifying parent:', error);
        }
    }

    /**
     * Close the submodule
     */
    function closeSubmodule(moduleName) {
        try {
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({ 
                    action: 'submoduleClosed',
                    source: moduleName
                }, '*');
            } else {
                window.close();
            }
        } catch (error) {
            console.error('[WindowControls] Error closing:', error);
        }
    }

    /**
     * Handle window control button actions
     */
    function handleWindowAction(action, btn) {
        const windowEl = document.querySelector('.window');
        const moduleName = document.body.getAttribute('data-module-name') || 'Submodule';
        
        switch (action) {
            case 'refresh':
                // Clear validation errors
                document.querySelectorAll('[class*="invalid"]').forEach(el => {
                    el.classList.remove(...Array.from(el.classList).filter(c => c.includes('invalid')));
                });
                window.location.reload();
                break;

            case 'maximize':
                if (windowEl) {
                    const isMaximized = windowEl.classList.toggle('maximized');
                    const icon = btn.querySelector('i');
                    if (icon) {
                        icon.className = isMaximized ? 'bi bi-fullscreen-exit' : 'bi bi-square';
                    }
                    btn.title = isMaximized ? 'Restore' : 'Maximize';
                    btn.setAttribute('aria-label', isMaximized ? 'Restore window' : 'Maximize window');
                    
                    // Notify parent to toggle sidebar
                    if (window.parent && window.parent !== window) {
                        window.parent.postMessage({ 
                            action: 'toggleSidebarForMaximize',
                            maximize: isMaximized
                        }, '*');
                    }
                }
                break;

            case 'close':
                closeSubmodule(moduleName);
                break;
        }
    }

    /**
     * Initialize window control buttons
     */
    function initWindowControls() {
        // Header buttons (.am-btn)
        document.querySelectorAll('.am-btn[data-action]').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const action = btn.getAttribute('data-action');
                handleWindowAction(action, btn);
            });
        });

        // Action panel close button
        document.querySelectorAll('.btn-action[data-action="close"]').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const moduleName = document.body.getAttribute('data-module-name') || 'Submodule';
                closeSubmodule(moduleName);
            });
        });
    }

    /**
     * Close child overlays (e.g., history forms)
     */
    function closeHistoryForm() {
        const overlay = document.querySelector('[data-history-overlay]');
        const iframe = document.querySelector('[data-history-iframe]');
        if (overlay) overlay.hidden = true;
        if (iframe) iframe.src = 'about:blank';
    }

    /**
     * Initialize on DOM ready
     */
    function init() {
        initWindowControls();
        
        const moduleName = document.body.getAttribute('data-module-name');
        if (moduleName) {
            notifyParentFormOpened(moduleName);
        }

        // Listen for close messages from child forms
        window.addEventListener('message', function(event) {
            if (event.data && event.data.action === 'closeHistoryForm') {
                closeHistoryForm();
            }
        });
    }

    // Auto-initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Export for programmatic use
    window.SubmoduleWindowControls = {
        close: closeSubmodule,
        closeHistory: closeHistoryForm
    };
})();
