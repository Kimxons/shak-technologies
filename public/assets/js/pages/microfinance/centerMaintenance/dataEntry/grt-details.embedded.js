(function () {
      const close = () => window.parent?.postMessage?.({ type: 'kairo-dataentry-close' }, '*');

      document.querySelectorAll('[data-dataentry-close]').forEach((btn) => {
        btn.addEventListener('click', () => close());
      });

      document.querySelectorAll('[data-mcn-de-action]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const type = btn.getAttribute('data-mcn-de-action');
          if (type === 'view') {
            window.alert('View is a UI stub in this prototype.');
            return;
          }
          if (type === 'add') {
            window.alert('Add is a UI stub in this prototype.');
            return;
          }
          window.alert(type + ' is disabled in this prototype.');
        });
      });

      const lookupSchemeBtn = document.querySelector('[data-mcn-lookup="schemeId"]');
      lookupSchemeBtn?.addEventListener('click', () => {
        window.alert('Scheme ID lookup is a UI stub in this prototype.');
      });

      document.querySelectorAll('[data-mcn-nav]').forEach((btn) => {
        btn.addEventListener('click', () => {
          window.alert('Navigation is a UI stub in this prototype.');
        });
      });
    })();
