(function () {
      const close = () => window.parent?.postMessage?.({ type: 'kairo-dataentry-close' }, '*');

      document.querySelectorAll('[data-dataentry-close]').forEach((btn) => {
        btn.addEventListener('click', () => close());
      });

      document.querySelectorAll('[data-clp-action]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const type = btn.getAttribute('data-clp-action');
          if (type === 'cancel') {
            close();
            return;
          }
          if (type === 'edit') {
            document.querySelectorAll('[data-clp-action="save"]').forEach((saveBtn) => {
              saveBtn.removeAttribute('disabled');
            });
            window.alert('Edit is a UI stub in this prototype.');
            return;
          }
          if (type === 'save') {
            window.alert('Save is a UI stub in this prototype.');
            return;
          }
        });
      });
    })();
