(function () {
      const close = () => window.parent?.postMessage?.({ type: 'kairo-dataentry-close' }, '*');

      document.querySelectorAll('[data-dataentry-close]').forEach((btn) => {
        btn.addEventListener('click', () => close());
      });

      document.querySelectorAll('[data-ur-lookup]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const which = btn.getAttribute('data-ur-lookup');
          window.alert('Lookup (' + which + ') is a UI stub in this prototype.');
        });
      });

      document.querySelectorAll('[data-ur-de-action]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const type = btn.getAttribute('data-ur-de-action');
          if (type === 'cancel' || type === 'back') {
            close();
            return;
          }

          window.alert(type.charAt(0).toUpperCase() + type.slice(1) + ' action is a UI stub in this prototype.');
        });
      });

      document.querySelectorAll('[data-ur-inline]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const type = btn.getAttribute('data-ur-inline');
          window.alert(type.charAt(0).toUpperCase() + type.slice(1) + ' action is a UI stub in this prototype.');
        });
      });
    })();
