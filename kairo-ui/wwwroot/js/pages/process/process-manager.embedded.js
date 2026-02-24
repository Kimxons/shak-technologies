(function () {
      const form = document.getElementById("process-manager-form");
      if (!form) return;

      const branchSearch = form.querySelector('[data-pm-branch-search]');
      const processSearch = form.querySelector('[data-pm-process-search]');
      const processLookup = form.querySelector('[data-pm-process-lookup]');
      const cancel = form.querySelector('[data-pm-action="cancel"]');

      const stub = (label) => window.alert(label + ' lookup is a UI stub in this prototype.');

      branchSearch?.addEventListener('click', () => stub('Branch'));
      processSearch?.addEventListener('click', () => stub('Process'));
      processLookup?.addEventListener('click', () => stub('Process'));

      cancel?.addEventListener('click', () => {
        try {
          const hostModal = window.frameElement?.closest?.('.legacy-modal');
          window.parent?.bootstrap?.Modal?.getOrCreateInstance(hostModal)?.hide();
        } catch (e) {
          // no-op
        }
      });
    })();
