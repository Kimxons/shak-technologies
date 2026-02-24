(function () {
      'use strict';
      document.addEventListener('click', function (event) {
        const closeBtn = event.target.closest('[data-lg-notes-action="close"]');
        if (!closeBtn) return;

        event.preventDefault();
        try {
          const modalEl = window.parent?.document?.getElementById('lgNotesModal');
          const parentBootstrap = window.parent?.bootstrap;
          if (modalEl && parentBootstrap?.Modal) {
            parentBootstrap.Modal.getOrCreateInstance(modalEl).hide();
          }
        } catch {
          // ignore
        }
      });
    })();
