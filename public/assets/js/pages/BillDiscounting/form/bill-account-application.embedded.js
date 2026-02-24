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

      // Modal Trigger handling
      const openParentModal = (modalId) => {
        if (window.parent && window.parent.bootstrap && window.parent.document.getElementById(modalId)) {
          const el = window.parent.document.getElementById(modalId);
          const modal = window.parent.bootstrap.Modal.getOrCreateInstance(el);
          modal.show();
        }
      };

      document.querySelectorAll('[data-open-parent-modal]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          openParentModal(btn.dataset.openParentModal);
        });
      });
    });
