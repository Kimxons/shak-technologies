(function () {
      const form = document.getElementById("unlock-users-form");
      if (!form) return;

      const actionProcess = form.querySelector('[data-uu-action="process"]');
      const actionCancel = form.querySelector('[data-uu-action="cancel"]');
      const branchSearch = form.querySelector('[data-uu-branch-search]');

      branchSearch?.addEventListener('click', () => {
        window.alert('Branch lookup is a UI stub in this prototype.');
      });

      actionCancel?.addEventListener('click', () => {
        try {
          const hostModal = window.frameElement?.closest?.('.legacy-modal');
          window.parent?.bootstrap?.Modal?.getOrCreateInstance(hostModal)?.hide();
        } catch (e) {
          // no-op
        }
      });

      // No data in the prototype yet, keep Process disabled.
      if (actionProcess) actionProcess.disabled = true;
    })();
