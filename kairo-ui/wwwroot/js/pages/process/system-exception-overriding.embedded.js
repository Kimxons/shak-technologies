(function () {
      const form = document.getElementById('system-exception-overriding-form');
      if (!form) return;

      form.querySelectorAll('[data-seo-lookup]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const which = btn.getAttribute('data-seo-lookup');
          window.alert('Lookup (' + which + ') is a UI stub in this prototype.');
        });
      });

      form.querySelectorAll('[data-seo-nav]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const which = btn.getAttribute('data-seo-nav');
          window.alert('Ref ID navigation (' + which + ') is a UI stub in this prototype.');
        });
      });

      form.querySelectorAll('[data-seo-inline]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const which = btn.getAttribute('data-seo-inline');
          if (which === 'clear') {
            form.querySelector('#Exception')?.setAttribute('value', '');
            const exception = form.querySelector('#Exception');
            const remarks = form.querySelector('#Remarks');
            const type = form.querySelector('#TypeOfAction');
            if (exception) exception.value = '';
            if (remarks) remarks.value = '';
            if (type) type.value = '';
            return;
          }
          window.alert('Inline action (' + which + ') is a UI stub in this prototype.');
        });
      });

      const actions = form.querySelectorAll('[data-seo-action]');
      actions.forEach((btn) => {
        btn.addEventListener('click', () => {
          const type = btn.getAttribute('data-seo-action');
          if (type === 'cancel') {
            const modalEl = window.frameElement?.closest?.('.modal');
            const modal = modalEl ? window.parent.bootstrap?.Modal.getOrCreateInstance(modalEl) : null;
            modal?.hide?.();
            return;
          }
          window.alert('System Exception Overriding (' + type + ') is a UI stub in this prototype.');
        });
      });

      // Enhanced date picker functionality
      const processDateInput = form.querySelector('#ProcessDate');
      const datePickerIcon = form.querySelector('.input-group-text[onclick]');
      
      if (processDateInput) {
        // Make the input area more interactive
        processDateInput.style.cursor = 'pointer';
        
        // Add click handler to the input group to open calendar
        const inputGroup = processDateInput.closest('.input-group');
        if (inputGroup) {
          inputGroup.addEventListener('click', (e) => {
            if (processDateInput.showPicker) {
              processDateInput.showPicker();
            } else {
              processDateInput.focus();
            }
          });
        }
        
        // Prevent double-click selection on the input
        processDateInput.addEventListener('click', (e) => {
          if (processDateInput.showPicker) {
            processDateInput.showPicker();
          }
        });
      }
    })();
