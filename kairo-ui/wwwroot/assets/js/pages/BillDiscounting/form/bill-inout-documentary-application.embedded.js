document.addEventListener('DOMContentLoaded', () => {
            // Sidebar Toggles (Collapsed/Expanded)
            document.querySelectorAll('.nav-toggle').forEach(btn => {
                const section = btn.closest('.nav-section');
                const items = section?.querySelector('.nav-items');

                // Keep initial state consistent for CSS selectors
                if (items) {
                    btn.classList.toggle('collapsed', items.classList.contains('collapsed'));
                }

                btn.addEventListener('click', () => {
                    if (!items) return;

                    const isCollapsed = items.classList.toggle('collapsed');
                    btn.classList.toggle('collapsed', isCollapsed);
                });
            });

            // Modal Trigger handling (Cross-Iframe)
            const openParentModal = (modalId) => {
                if (window.parent && window.parent.bootstrap && window.parent.document.getElementById(modalId)) {
                    const el = window.parent.document.getElementById(modalId);
                    const modal = window.parent.bootstrap.Modal.getOrCreateInstance(el);
                    modal.show();
                } else {
                    console.warn(`Parent modal [${modalId}] not found or parent window inaccessible.`);
                }
            };

            document.querySelectorAll('[data-open-parent-modal]').forEach(btn => {
                btn.addEventListener('click', () => {
                    openParentModal(btn.dataset.openParentModal);
                });
            });

            // Form Tooltip Initialization (Optional if needed)
            const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
            tooltipTriggerList.map(function (tooltipTriggerEl) {
                return new bootstrap.Tooltip(tooltipTriggerEl)
            });
        });
