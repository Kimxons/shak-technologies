(function (global) {
    'use strict';

    // Prevent duplicate initialization
    if (global.ToastMessages) return;

    // Toast configuration
    const TOAST_DURATION = 8000; // 8 seconds - plenty of time to read
    const TOAST_ICONS = {
        success: 'bi-check-circle-fill',
        error: 'bi-x-circle-fill',
        warning: 'bi-exclamation-triangle-fill',
        info: 'bi-info-circle-fill'
    };

    const TOAST_TITLES = {
        success: 'Success',
        error: 'Error',
        warning: 'Warning',
        info: 'Information'
    };

    let toastContainer = null;

    /**
     * Initialize toast container if not exists
     */
    function initToastContainer() {
        // Remove any existing toast containers to prevent duplicates
        const existingContainers = document.querySelectorAll('.kairo-toast-container, .toast-container');
        existingContainers.forEach(c => {
            if (c !== toastContainer) c.remove();
        });
        
        if (!toastContainer || !document.body.contains(toastContainer)) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'kairo-toast-container';
            // Force top-left position with inline styles - very specific positioning
            toastContainer.style.cssText = 'position: fixed !important; top: 20px !important; left: 20px !important; right: auto !important; bottom: auto !important; z-index: 99999 !important; display: flex; flex-direction: column; gap: 10px; pointer-events: none;';
            document.body.appendChild(toastContainer);
        }
        return toastContainer;
    }

    // Track last toast to prevent duplicates
    let lastToastKey = '';
    let lastToastTime = 0;

    /**
     * Create and show a toast notification
     * @param {string} type - Toast type: 'success', 'error', 'warning', 'info'
     * @param {string} message - The message to display
     * @param {Object} options - Additional options
     * @param {string} options.title - Custom title (optional)
     * @param {number} options.duration - Duration in milliseconds (default: 4000)
     * @param {boolean} options.autoClose - Whether to auto-close (default: true)
     */
    function showToast(type, message, options) {
        options = options || {};
        
        // Prevent duplicate toasts within 2 seconds
        const toastKey = type + ':' + message;
        const now = Date.now();
        if (toastKey === lastToastKey && (now - lastToastTime) < 2000) {
            return null;
        }
        lastToastKey = toastKey;
        lastToastTime = now;
        
        const container = initToastContainer();

        // Create toast element
        const toast = document.createElement('div');
        toast.className = `kairo-toast ${type}`;

        // Icon
        const icon = document.createElement('i');
        icon.className = `bi ${TOAST_ICONS[type]} toast-icon`;

        // Content
        const content = document.createElement('div');
        content.className = 'toast-content';

        const title = document.createElement('div');
        title.className = 'toast-title';
        title.textContent = options.title || TOAST_TITLES[type];

        const messageEl = document.createElement('div');
        messageEl.className = 'toast-message';
        messageEl.textContent = message;

        content.appendChild(title);
        content.appendChild(messageEl);

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'toast-close';
        closeBtn.innerHTML = '<i class="bi bi-x"></i>';
        closeBtn.setAttribute('aria-label', 'Close');
        closeBtn.onclick = function () {
            removeToast(toast);
        };

        // Progress bar
        const duration = options.duration !== undefined ? options.duration : TOAST_DURATION;
        const autoClose = options.autoClose !== undefined ? options.autoClose : true;

        if (autoClose && duration > 0) {
            const progress = document.createElement('div');
            progress.className = 'toast-progress';
            progress.style.animationDuration = duration + 'ms';
            toast.appendChild(progress);
        }

        // Assemble toast
        toast.appendChild(icon);
        toast.appendChild(content);
        toast.appendChild(closeBtn);

        // Add to container
        container.appendChild(toast);

        // Auto-remove after duration
        if (autoClose && duration > 0) {
            setTimeout(function () {
                removeToast(toast);
            }, duration);
        }

        return toast;
    }

    /**
     * Remove a toast with animation
     * @param {HTMLElement} toast - The toast element to remove
     */
    function removeToast(toast) {
        if (!toast || !toast.parentElement) return;

        toast.classList.add('toast-hiding');
        setTimeout(function () {
            if (toast.parentElement) {
                toast.parentElement.removeChild(toast);
            }
        }, 300); // Match animation duration
    }

    /**
     * Clear all toasts
     */
    function clearAll() {
        if (toastContainer) {
            const toasts = toastContainer.querySelectorAll('.toast');
            toasts.forEach(function (toast) {
                removeToast(toast);
            });
        }
    }

    // Public API
    const ToastMessages = {
        /**
         * Show a success toast
         * @param {string} message - The success message
         * @param {Object} options - Additional options
         */
        success: function (message, options) {
            return showToast('success', message, options);
        },

        /**
         * Show an error toast
         * @param {string} message - The error message
         * @param {Object} options - Additional options
         */
        error: function (message, options) {
            return showToast('error', message, options);
        },

        /**
         * Show a warning toast
         * @param {string} message - The warning message
         * @param {Object} options - Additional options
         */
        warning: function (message, options) {
            return showToast('warning', message, options);
        },

        /**
         * Show an info toast
         * @param {string} message - The info message
         * @param {Object} options - Additional options
         */
        info: function (message, options) {
            return showToast('info', message, options);
        },

        /**
         * Show a custom toast
         * @param {string} type - Toast type
         * @param {string} message - The message
         * @param {Object} options - Additional options
         */
        show: function (type, message, options) {
            return showToast(type, message, options);
        },

        /**
         * Clear all toasts
         */
        clearAll: clearAll
    };

    // Expose to global scope
    global.ToastMessages = ToastMessages;

    // Initialize container immediately
    initToastContainer();

})(window);
