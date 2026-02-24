(function () {
      const close = () => window.parent?.postMessage?.({ type: 'kairo-dataentry-close' }, '*');

      document.querySelectorAll('[data-dataentry-close]').forEach((btn) => {
        btn.addEventListener('click', () => close());
      });

      document.querySelectorAll('[data-mcn-lookup]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const which = btn.getAttribute('data-mcn-lookup');
          window.alert('Lookup (' + which + ') is a UI stub in this prototype.');
        });
      });

      document.querySelectorAll('[data-mcn-de-action]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const type = btn.getAttribute('data-mcn-de-action');
          if (type === 'cancel' || type === 'back') {
            close();
            return;
          }

          if (type === 'add') {
            window.alert('Add is a UI stub in this prototype.');
            return;
          }

          window.alert(type + ' is disabled in this prototype.');
        });
      });

      document.querySelectorAll('[data-cbd-inline]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const type = btn.getAttribute('data-cbd-inline');
          window.alert(type + ' is disabled in this prototype.');
        });
      });
    })();
