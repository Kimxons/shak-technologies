(function () {
    console.log('LettersOfCreditExportAmendment.js script executing');

    const init = () => {
        console.log('LettersOfCreditExportAmendment.js initializing logic...');

        // --- Stepper Navigation ---
        const stepperTriggers = document.querySelectorAll('.cm-stepper__trigger');
        const stepperPanels = document.querySelectorAll('.cm-stepper__panel');

        console.log(`Initialized: Found ${stepperTriggers.length} triggers and ${stepperPanels.length} panels.`);

        function switchStep(trigger) {
            const stepId = trigger.getAttribute('data-step-id');
            console.log(`LettersOfCreditExportAmendment.js: Attempting switch to: ${stepId}`);

            if (!stepId) {
                console.error("Trigger missing data-step-id attribute.");
                return;
            }

            // 1. Visually update triggers
            stepperTriggers.forEach(t => t.classList.remove('is-active'));
            trigger.classList.add('is-active');

            // 2. Hide all panels
            stepperPanels.forEach(panel => panel.classList.remove('is-active'));

            // 3. Find and show target panel
            // Using quotes in selector to handle spaces/special chars safely
            const targetPanel = document.querySelector(`.cm-stepper__panel[data-step-panel="${stepId}"]`);

            if (targetPanel) {
                targetPanel.classList.add('is-active');
                console.log(`LCApplication.js: Success - Switched to step ${stepId}`);
            } else {
                console.error(`Error: Target panel not found for stepId: '${stepId}'`);
                // Debug aid: list available panels
                stepperPanels.forEach(p => console.log(`Available panel ID: '${p.getAttribute('data-step-panel')}'`));
            }
        }

        stepperTriggers.forEach(trigger => {
            trigger.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                switchStep(trigger);
            });
        });


        // --- Left Sidebar Navigation ---
        const navItems = document.querySelectorAll('.cm-nav-toggle');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                navItems.forEach(n => n.classList.remove('is-active'));
                item.classList.add('is-active');
                console.log(`Sidebar nav clicked: ${item.dataset.navTarget || 'unknown'}`);
            });
        });

        console.log('LCApplication.js: Listeners attached.');
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
