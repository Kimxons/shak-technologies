document.addEventListener('DOMContentLoaded', () => {
        // Handle Add Director button
        const addDirectorBtn = document.getElementById('addDirectorBtn');
        const directorFormSection = document.getElementById('directorFormSection');

        if (addDirectorBtn && directorFormSection) {
            addDirectorBtn.addEventListener('click', () => {
                directorFormSection.style.display = 'block';
                directorFormSection.scrollIntoView({ behavior: 'smooth' });
            });
        }

        // Highlight active nav item when modal opens
        const modals = ['bankLogoModal', 'bankParametersModal', 'bankDirectorsModal'];
        const navItems = ['nav-bank-logo', 'nav-bank-parameters', 'nav-bank-directors'];

        modals.forEach((modalId, index) => {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.addEventListener('show.bs.modal', () => {
                    // Remove active from all nav items
                    navItems.forEach(navId => {
                        const navItem = document.getElementById(navId);
                        if (navItem) navItem.classList.remove('active');
                    });
                    // Add active to current nav item
                    const currentNav = document.getElementById(navItems[index]);
                    if (currentNav) currentNav.classList.add('active');
                });

                modal.addEventListener('hidden.bs.modal', () => {
                    // Remove active when modal closes
                    const currentNav = document.getElementById(navItems[index]);
                    if (currentNav) currentNav.classList.remove('active');
                });
            }
        });
    });
