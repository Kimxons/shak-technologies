(function () {
      const form = document.getElementById('change-installment-date-form');
      if (!form) return;

      form.querySelectorAll('[data-cid-lookup]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const which = btn.getAttribute('data-cid-lookup');
          window.alert('Lookup (' + which + ') is a UI stub in this prototype.');
        });
      });

      form.querySelectorAll('[data-cid-action]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const type = btn.getAttribute('data-cid-action');

          if (type === 'cancel') {
            const modalEl = window.frameElement?.closest?.('.modal');
            const modal = modalEl ? window.parent.bootstrap?.Modal.getOrCreateInstance(modalEl) : null;
            modal?.hide?.();
            return;
          }

          if (type === 'generate') {
            window.alert('Generate is a UI stub in this prototype.');
            return;
          }

          window.alert(type + ' is disabled in this prototype.');
        });
      });
    })();
