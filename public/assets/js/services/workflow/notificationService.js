/**
 * Notification Service
 * Provides centralized toast notifications for the application
 */
(function(global) {
    'use strict';

    const NotificationService = {
        /**
         * Show a toast notification
         * @param {string} message - Message to display
         * @param {string} type - 'success', 'error', 'warning', 'info'
         * @param {number} duration - Duration in ms (default 3000)
         */
        showToast(message, type = 'info', duration = 3000) {
            const icon = {
                success: '✅',
                error: '❌',
                warning: '⚠️',
                info: 'ℹ️'
            };

            const colors = {
                success: '#27AE60',
                error: '#E74C3C',
                warning: '#F39C12',
                info: '#4A90E2'
            };

            console.log(`[${type.toUpperCase()}] ${message}`);

            // Create toast container if it doesn't exist
            let toastContainer = document.getElementById('toast-notification-container');
            if (!toastContainer) {
                toastContainer = document.createElement('div');
                toastContainer.id = 'toast-notification-container';
                toastContainer.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 10000;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                `;
                document.body.appendChild(toastContainer);
            }

            // Create toast element
            const toast = document.createElement('div');
            toast.className = 'custom-toast';
            toast.style.cssText = `
                background: ${colors[type] || colors.info};
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                font-size: 14px;
                font-weight: 500;
                display: flex;
                align-items: center;
                gap: 12px;
                min-width: 300px;
                max-width: 450px;
                opacity: 0;
                transform: translateX(100%);
                transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            `;
            
            // Allow HTML in message for bolding etc, but sanitize if needed (assuming internal trusted strings here)
            toast.innerHTML = `
                <span style="font-size: 18px; line-height: 1;">${icon[type] || icon.info}</span>
                <span style="flex: 1;">${message}</span>
                <span style="cursor: pointer; opacity: 0.7; font-size: 16px;" onclick="this.parentElement.remove()">✕</span>
            `;

            toastContainer.appendChild(toast);

            // Animate in
            requestAnimationFrame(() => {
                toast.style.opacity = '1';
                toast.style.transform = 'translateX(0)';
            });

            // Auto dismiss
            if (duration > 0) {
                setTimeout(() => {
                    if (toast.parentElement) {
                        toast.style.opacity = '0';
                        toast.style.transform = 'translateX(100%)';
                        setTimeout(() => {
                            if (toast.parentElement) {
                                toast.remove();
                            }
                        }, 300);
                    }
                }, duration);
            }
        },

        success(message, duration) {
            this.showToast(message, 'success', duration);
        },

        error(message, duration) {
            this.showToast(message, 'error', duration);
        },

        warning(message, duration) {
            this.showToast(message, 'warning', duration);
        },

        info(message, duration) {
            this.showToast(message, 'info', duration);
        }
    };

    global.NotificationService = NotificationService;

})(window);
