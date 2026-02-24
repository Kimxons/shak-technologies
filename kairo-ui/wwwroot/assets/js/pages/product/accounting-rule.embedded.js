(function () {
      const controls = document.querySelectorAll('[data-window-action]');

      function closeParentModal() {
        try {
          if (window.parent && window.parent !== window) {
            const modalEl = window.parent.document.querySelector('.modal.show');
            if (modalEl && window.parent.bootstrap && window.parent.bootstrap.Modal) {
              const instance = window.parent.bootstrap.Modal.getInstance(modalEl) || new window.parent.bootstrap.Modal(modalEl);
              instance.hide();
              return;
            }
          }
        } catch (e) {
          // noop
        }

        try {
          window.close();
        } catch (e) {
          // noop
        }
      }

      function minimize() {
        document.body.classList.add('cm-window-minimized');
      }

      function restore() {
        document.body.classList.remove('cm-window-minimized');
      }

      controls.forEach((btn) => {
        btn.addEventListener('click', () => {
          const action = btn.getAttribute('data-window-action');
          if (action === 'close') closeParentModal();
          if (action === 'minimize') minimize();
          if (action === 'restore') restore();
        });
      });

      // Form interactions
      const actionButtons = document.querySelectorAll('.btn[data-action]');
      actionButtons.forEach(btn => {
        btn.addEventListener('click', function() {
          const action = this.dataset.action;
          console.log(`Action triggered: ${action}`);
          // Add your action logic here
        });
      });

      // Add Event button functionality
      const addEventBtn = document.querySelector('[data-add-event]');
      addEventBtn?.addEventListener('click', function () {
        // Add logic to show add event modal or form
        console.log('Add Event clicked');
      });

      const ruleDetailsLink = document.querySelector('[data-open-rule-details]');
      const ruleDetailsFrame = document.getElementById('ruleDetailsFrame');
      const ruleDetailsModalEl = document.getElementById('ruleDetailsModal');

      ruleDetailsLink?.addEventListener('click', (event) => {
        event.preventDefault();

        if (ruleDetailsFrame) {
          const url = new URL(ruleDetailsFrame.getAttribute('src') || '../data-entry/rule-details.html', window.location.href);
          url.searchParams.set('v', String(Date.now()));
          ruleDetailsFrame.setAttribute('src', url.pathname + url.search);
        }

        if (ruleDetailsModalEl && window.bootstrap?.Modal) {
          const instance = window.bootstrap.Modal.getOrCreateInstance(ruleDetailsModalEl);
          instance.show();
        }
      });

      window.addEventListener('message', (event) => {
        if (!event?.data || typeof event.data !== 'object') return;
        if (event.data.type !== 'close-rule-details') return;
        if (!ruleDetailsModalEl || !window.bootstrap?.Modal) return;
        const instance = window.bootstrap.Modal.getInstance(ruleDetailsModalEl);
        instance?.hide();
      });
    })();
