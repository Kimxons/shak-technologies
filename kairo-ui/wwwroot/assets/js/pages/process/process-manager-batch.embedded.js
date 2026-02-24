(function () {
      const form = document.getElementById("process-manager-batch-form");
      if (!form) return;

      const allRegions = document.getElementById('AllRegions');
      const regionId = document.getElementById('RegionId');
      const regionSearch = form.querySelector('[data-pmb-region-search]');
      const processIdLabel = document.getElementById('ProcessIdLabel');
      const processSearch = form.querySelector('[data-pmb-process-search]');
      const cancel = form.querySelector('[data-pmb-action="cancel"]');

      const syncRegionState = () => {
        const disabled = !!allRegions?.checked;
        if (regionId) regionId.disabled = disabled;
        if (regionSearch) regionSearch.disabled = disabled;
        
        // Toggle Process ID mandatory state
        if (processIdLabel) {
          if (disabled) {
            // All Regions checked: Process ID is mandatory (blue)
            processIdLabel.classList.add('text-primary');
          } else {
            // All Regions unchecked: Process ID is not mandatory
            processIdLabel.classList.remove('text-primary');
          }
        }
      };

      allRegions?.addEventListener('change', syncRegionState);
      syncRegionState();

      const stub = (label) => window.alert(label + ' lookup is a UI stub in this prototype.');
      regionSearch?.addEventListener('click', () => stub('Region'));
      processSearch?.addEventListener('click', () => stub('Process'));

      cancel?.addEventListener('click', () => {
        try {
          const hostModal = window.frameElement?.closest?.('.legacy-modal');
          window.parent?.bootstrap?.Modal?.getOrCreateInstance(hostModal)?.hide();
        } catch (e) {
          // no-op
        }
      });
    })();
