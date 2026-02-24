(function () {
      const close = () => window.parent?.postMessage?.({ type: 'kairo-dataentry-close' }, '*');

      document.querySelectorAll('[data-dataentry-close]').forEach((btn) => {
        btn.addEventListener('click', () => close());
      });

      document.querySelectorAll('[data-mcs-lookup]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const which = btn.getAttribute('data-mcs-lookup');
          window.alert('Lookup (' + which + ') is a UI stub in this prototype.');
        });
      });

      document.querySelectorAll('[data-clm-action]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const type = btn.getAttribute('data-clm-action');
          if (type === 'cancel') {
            close();
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
