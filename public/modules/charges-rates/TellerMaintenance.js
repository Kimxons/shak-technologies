document.addEventListener('DOMContentLoaded', () => {
    console.log('Teller Maintenance module loaded');

    // Button event listeners
    const buttons = document.querySelectorAll('.cm-shell__action');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            console.log('Action clicked:', btn.getAttribute('aria-label'));
        });
    });

    // Update Taskbar Title
    try {
        // We need to create a new modal/taskbar entry for this
        // Or if it reuses an existing one, update it.
    } catch (e) {
        console.warn('Could not access parent taskbar');
    }
});
