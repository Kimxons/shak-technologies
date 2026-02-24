(function () {
      const form = document.getElementById('bank-process-setting-form');
      if (!form) return;

      form.querySelectorAll('[data-bps-lookup]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const which = btn.getAttribute('data-bps-lookup');
          window.alert('Lookup (' + which + ') is a UI stub in this prototype.');
        });
      });

      const actions = form.querySelectorAll('[data-bps-action]');
      actions.forEach((btn) => {
        btn.addEventListener('click', () => {
          const type = btn.getAttribute('data-bps-action');
          if (type === 'cancel') {
            const modalEl = window.frameElement?.closest?.('.modal');
            const modal = modalEl ? window.parent.bootstrap?.Modal.getOrCreateInstance(modalEl) : null;
            modal?.hide?.();
            return;
          }
          window.alert('Bank Process Setting (' + type + ') is a UI stub in this prototype.');
        });
      });
    })();
