(function () {
      const form = document.getElementById('exit-types-form');
      if (!form) return;

      form.querySelectorAll('[data-et-lookup]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const which = btn.getAttribute('data-et-lookup');
          window.alert('Lookup (' + which + ') is a UI stub in this prototype.');
        });
      });

      form.querySelectorAll('[data-et-action]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const type = btn.getAttribute('data-et-action');

          if (type === 'cancel') {
            const modalEl = window.frameElement?.closest?.('.modal');
            const modal = modalEl ? window.parent.bootstrap?.Modal.getOrCreateInstance(modalEl) : null;
            modal?.hide?.();
            return;
          }

          if (type === 'view') {
            window.alert('View is a UI stub in this prototype.');
            return;
          }

          window.alert(type + ' is disabled in this prototype.');
        });
      });
    })();
