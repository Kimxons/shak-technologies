(function () {
      const form = document.getElementById('cpiw-form');
      if (!form) return;

      form.querySelectorAll('[data-cpiw-lookup]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const which = btn.getAttribute('data-cpiw-lookup');
          window.alert('Lookup (' + which + ') is a UI stub in this prototype.');
        });
      });

      form.querySelectorAll('[data-cpiw-inline]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const which = btn.getAttribute('data-cpiw-inline');
          window.alert(which + ' is disabled in this prototype.');
        });
      });

      form.querySelectorAll('[data-cpiw-action]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const type = btn.getAttribute('data-cpiw-action');

          if (type === 'cancel') {
            const modalEl = window.frameElement?.closest?.('.modal');
            const modal = modalEl ? window.parent.bootstrap?.Modal.getOrCreateInstance(modalEl) : null;
            modal?.hide?.();
            return;
          }

          window.alert(type + ' is disabled in this prototype.');
        });
      });
    })();
