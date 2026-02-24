document.addEventListener('DOMContentLoaded', () => {
    // Initialize any necessary logic here
    console.log('Exchange Rates - Updation module loaded');

    // Handle form actions similar to other modules
    const buttons = document.querySelectorAll('.cm-shell__action');
    buttons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const action = e.target.textContent.trim();
            console.log(`Action triggered: ${action}`);

            // Add visual feedback
            const originalText = e.target.innerHTML;
            e.target.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
            setTimeout(() => {
                e.target.innerHTML = originalText;
            }, 500);
        });
    });
});
