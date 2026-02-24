(function () {
      const form = document.getElementById('exit-process-form');
      if (!form) return;

      form.querySelectorAll('[data-ep-lookup]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const which = btn.getAttribute('data-ep-lookup');
          window.alert('Lookup (' + which + ') is a UI stub in this prototype.');
        });
      });

      form.querySelectorAll('[data-ep-action]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const type = btn.getAttribute('data-ep-action');

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
