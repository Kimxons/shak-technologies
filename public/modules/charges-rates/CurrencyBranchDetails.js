document.addEventListener('DOMContentLoaded', () => {
    // Initialize any necessary logic here
    console.log('Currency Branch Details module loaded');

    // Navigation Logic
    const navItems = document.querySelectorAll('.cm-legacy-nav__item');
    const forms = document.querySelectorAll('.cm-legacy-content form');
    const toggleButton = document.querySelector('.cm-dataentry-toggle');
    const navList = document.querySelector('.cm-legacy-nav__list');
    const toggleText = toggleButton?.querySelector('span');

    // Toggle dropdown
    if (toggleButton && navList) {
        toggleButton.addEventListener('click', (e) => {
            // If clicking the parent, navigating to "Data Entry" is the primary action
            // but we also toggle the list for accessing other items.

            // 1. Navigate to Data Entry Form
            forms.forEach(form => {
                if (form.getAttribute('data-screen') === 'data-entry') {
                    form.classList.remove('d-none');
                } else {
                    form.classList.add('d-none');
                }
            });

            // 2. Update Header Text (if applicable)
            if (toggleText) {
                toggleText.textContent = "DataEntry";
            }

            // 3. Reset active state on children (since parent is now "active")
            navItems.forEach(nav => nav.classList.remove('is-active'));

            // Update Taskbar to reflect main view
            updateTaskbarTitle("DataEntry");

            // 4. Toggle the list expand/collapse
            const isExpanded = toggleButton.getAttribute('aria-expanded') === 'true';
            toggleButton.setAttribute('aria-expanded', !isExpanded);
            navList.classList.toggle('is-collapsed', isExpanded);
            toggleButton.querySelector('.bi').style.transform = isExpanded ? 'rotate(-90deg)' : 'rotate(0deg)';
        });
    }

    const updateTaskbarTitle = (title) => {
        try {
            const taskbarBtn = window.parent.document.querySelector('[data-taskbar-modal="currencyBranchDetailsModal"]');
            if (taskbarBtn) {
                // Preserve the icon, update only the text
                const icon = taskbarBtn.querySelector('i');
                const iconHtml = icon ? icon.outerHTML : '<i class="fas fa-code-branch"></i>'; // Default fallback
                taskbarBtn.innerHTML = `${iconHtml} ${title}`;
            }
        } catch (err) {
            console.error("Could not update taskbar title", err);
        }
    };

    // Switch screens
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetScreen = item.getAttribute('data-nav-target');

            // Update active state in nav
            navItems.forEach(nav => nav.classList.remove('is-active'));
            item.classList.add('is-active');

            const newTitle = item.textContent.trim();

            // Update header text
            if (toggleText) {
                toggleText.textContent = newTitle;
            }

            // Update Taskbar
            updateTaskbarTitle(newTitle);

            // Show target form
            forms.forEach(form => {
                if (form.getAttribute('data-screen') === targetScreen) {
                    form.classList.remove('d-none');
                } else {
                    form.classList.add('d-none');
                }
            });
        });
    });

    // Handle form actions similar to other modules
    const buttons = document.querySelectorAll('.cm-shell__action');
    buttons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const action = e.target.textContent.trim();
            const label = e.target.closest('button').getAttribute('aria-label');

            if (!action && label) {
                // Handle icon-only buttons
            } else {
                console.log(`Action triggered: ${action}`);

                // Add visual feedback
                const originalText = e.target.innerHTML;
                if (!e.target.querySelector('i') && action !== "") {
                    e.target.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
                    setTimeout(() => {
                        e.target.innerHTML = originalText;
                    }, 500);
                }
            }
        });
    });
});
