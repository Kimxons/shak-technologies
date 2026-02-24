(function () {
      const close = () => window.parent?.postMessage?.({ type: 'kairo-dataentry-close' }, '*');

      document.querySelectorAll('[data-dataentry-close]').forEach((btn) => {
        btn.addEventListener('click', () => close());
      });

      document.querySelectorAll('[data-rm-de-action]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const type = btn.getAttribute('data-rm-de-action');
          if (type === 'view') {
            window.alert('View is a UI stub in this prototype.');
            return;
          }
          window.alert(type + ' is disabled in this prototype.');
        });
      });
    })();
