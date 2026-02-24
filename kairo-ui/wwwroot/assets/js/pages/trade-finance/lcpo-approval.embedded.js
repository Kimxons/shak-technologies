(function () {
      const chargesBtn = document.querySelector('[data-tf-action="charges"]');
      if (!chargesBtn) return;

      chargesBtn.addEventListener('click', function () {
        try {
          window.parent.postMessage({
            type: 'kairo-open-modal',
            modalId: 'lcAmendmentChargesModal',
            preserveOthers: true
          }, '*');
        } catch (e) {
          console.warn('Unable to request Charges modal', e);
        }
      });
    })();
