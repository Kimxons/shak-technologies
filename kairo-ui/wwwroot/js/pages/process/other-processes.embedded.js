(function () {
      const form = document.getElementById('other-processes-form');
      if (!form) return;

      const action = form.querySelector('[data-op-action="process"]');
      const select = document.getElementById('Process');

      action?.addEventListener('click', () => {
        const targetModalId = select?.value;
        if (!targetModalId) {
          window.alert('Select a Process first.');
          return;
        }

        const parentWindow = window.parent;
        const bootstrapLib = parentWindow?.bootstrap;
        if (!bootstrapLib?.Modal) {
          window.alert('Unable to open process window (bootstrap not found).');
          return;
        }

        const currentModalEl = window.frameElement?.closest?.('.modal');
        const targetModalEl = parentWindow.document.getElementById(targetModalId);
        if (!targetModalEl) {
          window.alert('Target process window not found: ' + targetModalId);
          return;
        }

        try {
          if (currentModalEl) {
            bootstrapLib.Modal.getOrCreateInstance(currentModalEl).hide();
          }
          bootstrapLib.Modal.getOrCreateInstance(targetModalEl).show();
        } catch (e) {
          console.error(e);
          window.alert('Unable to open process window.');
        }
      });
    })();
