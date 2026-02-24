function closeSelfModal() {
            try {
                const modalEl = window.frameElement?.closest('.legacy-modal');
                const bs = window.parent?.bootstrap;
                if (modalEl && bs?.Modal) {
                    bs.Modal.getOrCreateInstance(modalEl).hide();
                    return;
                }
            } catch (_) {
                // Fallback to postMessage
            }
            window.parent?.postMessage({ action: 'closeModal' }, '*');
        }

        // Back button closes this modal
        document.querySelector('[data-action="back"]')?.addEventListener('click', function (e) {
            e.preventDefault();
            closeSelfModal();
        });

        // Handle charges button click
        document.querySelector('[data-action="charges"]').addEventListener('click', function(e) {
            e.preventDefault();
            window.top.postMessage({ 
                action: 'openModal', 
                modalId: 'lcSettlementChargesModal' 
            }, '*');
        });
