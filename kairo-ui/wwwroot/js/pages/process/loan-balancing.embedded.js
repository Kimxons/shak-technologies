(function () {
      const form = document.getElementById('loan-balancing-form');
      if (!form) return;

      const viewBtn = form.querySelector('[data-lb-action="view"]');
      const balanceBtn = form.querySelector('[data-lb-action="balance"]');

      const actions = form.querySelectorAll('[data-lb-action]');
      actions.forEach((btn) => {
        btn.addEventListener('click', () => {
          const type = btn.getAttribute('data-lb-action');
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

          if (type === 'balance') {
            window.alert('Balance is a UI stub in this prototype.');
            return;
          }
        });
      });

      form.querySelectorAll('[data-lb-lookup]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const which = btn.getAttribute('data-lb-lookup');
          window.alert('Lookup (' + which + ') is a UI stub in this prototype.');
        });
      });

      // No data yet: keep Balance disabled until we have selectable rows.
      if (viewBtn) viewBtn.disabled = false;
      if (balanceBtn) balanceBtn.disabled = true;
    })();
