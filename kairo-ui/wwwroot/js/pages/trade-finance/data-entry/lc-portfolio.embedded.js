// Handle back button click
        document.querySelector('[data-action="back"]')?.addEventListener('click', function(e) {
            e.preventDefault();

            // Preferred: close the containing legacy modal directly (same-origin)
            try {
                const parentWin = window.parent;
                const modalEl = window.frameElement?.closest('.legacy-modal');
                const bs = parentWin?.bootstrap;
                if (modalEl && bs?.Modal) {
                    bs.Modal.getOrCreateInstance(modalEl).hide();
                    return;
                }
            } catch (_) {
                // Fall through to postMessage fallback
            }

            // Fallback: ask host page to close the modal
            window.parent?.postMessage({ action: 'closeModal' }, '*');
        });
