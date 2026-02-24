document.addEventListener('DOMContentLoaded', () => {
      // Sidebar Toggles
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
    });
