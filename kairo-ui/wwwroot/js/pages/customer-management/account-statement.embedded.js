document.addEventListener('DOMContentLoaded', () => {
            const closeButtons = document.querySelectorAll('.action-btn.primary, .action-btn:last-child');
            closeButtons.forEach(btn => {
                if (btn.textContent.trim() === 'Cancel' || btn.textContent.trim() === 'Back') {
                    btn.addEventListener('click', () => {
                        window.parent.postMessage('close-account-statement', '*');
                    });
                }
            });

            // Also the X button in the inner header
            const xButton = document.querySelector('.ctrl-btn .fa-times')?.parentElement;
            if (xButton) {
                xButton.addEventListener('click', () => {
                    window.parent.postMessage('close-account-statement', '*');
                });
            }
        });
