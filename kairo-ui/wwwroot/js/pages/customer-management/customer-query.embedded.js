document.addEventListener('DOMContentLoaded', () => {
            const accountStatementLink = document.querySelector('.nav-item-link'); // First link is Account Statement
            if (accountStatementLink && accountStatementLink.textContent.trim() === 'Account Statement') {
                accountStatementLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    loadAccountStatement();
                });
            }

            function loadAccountStatement() {
                // Create overlay
                const overlay = document.createElement('div');
                overlay.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.4);
                    backdrop-filter: blur(4px);
                    z-index: 9999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                `;

                // Create modal container
                const modal = document.createElement('div');
                modal.style.cssText = `
                    width: 95%;
                    height: 90vh;
                    background: white;
                    border-radius: 16px;
                    overflow: hidden;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                    display: flex;
                    flex-direction: column;
                `;

                // Add Iframe
                const iframe = document.createElement('iframe');
                iframe.src = 'account-statement.html';
                iframe.style.cssText = `
                    flex: 1;
                    width: 100%;
                    border: none;
                `;

                modal.appendChild(iframe);
                overlay.appendChild(modal);
                document.body.appendChild(overlay);

                // Close on overlay click (optional, but good for UX in prototype)
                overlay.addEventListener('click', (e) => {
                    if (e.target === overlay) {
                        overlay.remove();
                    }
                });

                // Also handle messages from iframe if needed
                window.addEventListener('message', (event) => {
                    if (event.data === 'close-account-statement') {
                        overlay.remove();
                    }
                });
            }
        });
