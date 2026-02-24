(function () {
      const close = () => window.parent?.postMessage?.({ type: 'kairo-dataentry-close' }, '*');

      document.querySelectorAll('[data-dataentry-close]').forEach((btn) => {
        btn.addEventListener('click', () => close());
      });

      document.querySelectorAll('[data-cu-lookup]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const which = btn.getAttribute('data-cu-lookup');
          window.alert('Lookup (' + which + ') is a UI stub in this prototype.');
        });
      });

      document.querySelectorAll('[data-cu-action]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const action = btn.getAttribute('data-cu-action');
          if (action === 'addUser') {
            window.alert('Add new user is a UI stub in this prototype.');
            return;
          }
          window.alert(action + ' is a UI stub in this prototype.');
        });
      });

      document.querySelectorAll('[data-cu-de-action]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const type = btn.getAttribute('data-cu-de-action');
          if (type === 'cancel' || type === 'back') {
            close();
            return;
          }

          window.alert(type + ' is a UI stub in this prototype.');
        });
      });
    })();
