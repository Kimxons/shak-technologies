document.addEventListener('DOMContentLoaded', () => {
    console.log('Till Maintenance module loaded');

    // Navigation logic
    const navToggles = document.querySelectorAll('.cm-nav-toggle');
    const navItems = document.querySelectorAll('.cm-legacy-nav__item');
    const forms = document.querySelectorAll('.cm-top-identifiers');

    navToggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            // Specific handling for View toggle if needed, or generic
            const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
            toggle.setAttribute('aria-expanded', !isExpanded);
            const list = toggle.nextElementSibling;
            if (list && list.classList.contains('cm-legacy-nav__list')) {
                // If it's the DataEntry toggle (which is now a proper nav-toggle), or View toggle
                list.style.display = isExpanded ? 'none' : 'flex';
            }
            const icon = toggle.querySelector('.bi');
            if (icon) {
                icon.style.transform = isExpanded ? 'rotate(-90deg)' : 'rotate(0deg)';
            }
        });
    });

    // Switch screens logic
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const target = item.getAttribute('data-nav-target');
            if (!target || target === 'till-allocation-history') return;

            e.preventDefault();
            console.log(`Navigating to: ${target}`);

            // 1. Update active nav item
            navItems.forEach(nav => nav.classList.remove('is-active'));
            item.classList.add('is-active');

            // 2. Show corresponding form
            let matchFound = false;
            forms.forEach(form => {
                const screenName = form.getAttribute('data-screen');
                if (screenName === target) {
                    form.classList.remove('d-none');
                    // Remove inline display style to let CSS/Bootstrap rule take over, or force block if needed.
                    // d-none has !important usually, so removing it should show the element (assuming it's block by default)
                    form.style.display = '';
                    matchFound = true;
                } else {
                    form.classList.add('d-none');
                    form.style.display = ''; // Clean up inline styles
                }
            });

            if (!matchFound) {
                console.warn(`No form found for target: ${target}`);
            }

            // 3. Update Title (Taskbar)
            const titleMap = {
                'till-currency': 'Till Currency Maintenance'
            };
            const newTitle = titleMap[target] || 'Till Maintenance';

            try {
                const taskbarBtn = window.parent.document.querySelector('[data-taskbar-modal="tillMaintenanceModal"]');
                if (taskbarBtn) {
                    const icon = taskbarBtn.querySelector('i');
                    const iconHtml = icon ? icon.outerHTML : '<i class="fas fa-cash-register"></i>';
                    taskbarBtn.innerHTML = `${iconHtml} ${newTitle}`;
                }
            } catch (err) {
                console.error('Error updating taskbar:', err);
            }
        });
    });

    // Force initial state based on active button
    const activeNav = document.querySelector('.cm-legacy-nav__item.is-active');
    if (activeNav) {
        // Trigger a click or manually set state to ensure sync
        const target = activeNav.getAttribute('data-nav-target');
        if (target) {
            forms.forEach(form => {
                if (form.getAttribute('data-screen') === target) {
                    form.classList.remove('d-none');
                    form.style.display = 'block';
                } else {
                    form.classList.add('d-none');
                    form.style.display = 'none';
                }
            });
        }
    }

    // Handle Actions
    const actions = document.querySelectorAll('.cm-shell__action');
    actions.forEach(btn => {
        btn.addEventListener('click', (e) => {
            console.log('Action clicked:', btn.getAttribute('aria-label'));
            // Simple visual feedback
            if (!btn.classList.contains('fw-bold')) {
                // In a real app, this would handle logic. 
                // For now, if "View" is clicked, we might re-bold it.
            }
        });
    });

    // Update Taskbar Title
    try {
        const taskbarBtn = window.parent.document.querySelector('[data-taskbar-modal="tillMaintenanceModal"]');
        if (taskbarBtn) {
            // Ensure it has the correct title on load
        }
    } catch (e) {
        console.warn('Could not access parent taskbar');
    }
});
