(function () {
      const controls = document.querySelectorAll('[data-window-action]');

      function closeParentModal() {
        try {
          if (window.parent && window.parent !== window) {
            const modalEl = window.parent.document.querySelector('.modal.show');
            if (modalEl && window.parent.bootstrap && window.parent.bootstrap.Modal) {
              const instance = window.parent.bootstrap.Modal.getInstance(modalEl) || new window.parent.bootstrap.Modal(modalEl);
              instance.hide();
              return;
            }
          }
        } catch (e) {
          // noop
        }

        try {
          window.close();
        } catch (e) {
          // noop
        }
      }

      function minimize() {
        document.body.classList.add('cm-window-minimized');
      }

      function restore() {
        document.body.classList.remove('cm-window-minimized');
      }

      controls.forEach((btn) => {
        btn.addEventListener('click', () => {
          const action = btn.getAttribute('data-window-action');
          if (action === 'close') closeParentModal();
          if (action === 'minimize') minimize();
          if (action === 'restore') restore();
        });
      });
    })();
