(() => {
    if (window.__billPortfolioLoaded) {
        console.warn("bill-portfolio.js already loaded; skipping duplicate execution.");
        return;
    }
    window.__billPortfolioLoaded = true;

    const supportedPages = ["bill-portfolio"];
    const activePage = document.body?.dataset?.page;
    if (!supportedPages.includes(activePage)) {
        return;
    }

    document.addEventListener("click", (event) => {
        const button = event.target.closest("[data-bill-portfolio-action]");
        if (!button) return;

        const action = (button.dataset.billPortfolioAction || "").trim().toLowerCase();
        if (action !== "back" && action !== "cancel" && action !== "close") return;

        // Prefer closing the parent dashboard modal if this page is hosted in one.
        try {
            const parent = window.parent;
            const modalId = "billPortfolioModal";
            const modalEl = parent?.document?.getElementById(modalId);

            if (modalEl) {
                // Try Bootstrap 5 standard way first
                const bootstrapLib = parent?.bootstrap || window.bootstrap || parent?.parent?.bootstrap;
                if (bootstrapLib?.Modal) {
                    const instance = bootstrapLib.Modal.getInstance(modalEl) || bootstrapLib.Modal.getOrCreateInstance(modalEl);
                    if (instance) {
                        instance.hide();
                        return;
                    }
                }

                // Fallback: Trigger the close button in the modal header if it exists
                const closeBtn = modalEl.querySelector('[data-window-action="close"], [data-bs-dismiss="modal"]');
                if (closeBtn) {
                    closeBtn.click();
                    return;
                }
            }
        } catch (e) {
            console.error("Failed to close parent modal", e);
        }

        // Fallback if opened directly.
        window.history.back();
    });
})();
