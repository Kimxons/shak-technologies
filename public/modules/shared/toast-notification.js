/* Shared Toast Notification Logic */
(function (global) {
    function ensureToastElement() {
        if (document.getElementById('toast')) return;

        const toastDiv = document.createElement('div');
        toastDiv.id = 'toast';
        toastDiv.className = 'toast-notification';

        const icon = document.createElement('i');
        icon.className = 'bi bi-info-circle';

        const span = document.createElement('span');
        span.id = 'toastMessage';

        toastDiv.appendChild(icon);
        toastDiv.appendChild(span);
        document.body.appendChild(toastDiv);
    }

    // Inject styles if they don't exist
    function ensureToastStyles() {
        if (document.getElementById('toast-styles')) return;

        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
            .toast-notification {
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%) translateY(-100px);
                padding: 10px 20px;
                border-radius: 4px;
                background: #333;
                color: #fff;
                font-size: 12px;
                font-weight: 600;
                z-index: 9999;
                transition: transform 0.3s ease;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .toast-notification--visible {
                transform: translateX(-50%) translateY(0);
            }

            .toast--success {
                background-color: var(--success, #28a745);
            }

            .toast--error {
                background-color: var(--danger, #dc3545);
            }

            .toast--info {
                background-color: var(--danger, #dc3545);
            }
        `;
        document.head.appendChild(style);
    }

    function showToast(message, type = 'success') {
        ensureToastStyles();
        ensureToastElement();

        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');
        if (!toast || !toastMessage) return;

        // set Icon based on type
        const icon = toast.querySelector('i');
        if (icon) {
            icon.className = type === 'success' ? 'bi bi-check-circle' : 'bi bi-exclamation-triangle-fill';
        }

        toastMessage.textContent = message;
        // Reset classes first - keep base class
        toast.className = 'toast-notification';

        // Add specific classes (force reflow/update)
        // Using setTimeout to ensure property transition
        setTimeout(() => {
            toast.className = `toast-notification toast-notification--visible toast--${type}`;
        }, 10);

        if (global.toastTimeout) {
            clearTimeout(global.toastTimeout);
        }

        global.toastTimeout = setTimeout(() => {
            toast.classList.remove('toast-notification--visible');
        }, 3000);
    }

    // Expose to global scope
    global.Toast = {
        show: showToast,
        success: (msg) => showToast(msg, 'success'),
        error: (msg) => showToast(msg, 'error')
    };

})(window);
