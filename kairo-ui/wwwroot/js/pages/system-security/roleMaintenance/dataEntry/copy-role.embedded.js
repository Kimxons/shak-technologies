(function () {
      const close = () => window.parent?.postMessage?.({ type: 'kairo-dataentry-close' }, '*');

      const newRoleIdEl = document.getElementById('NewRoleId');
      const newRoleNameEl = document.getElementById('NewRoleName');
      const saveBtn = document.querySelector('[data-cu-save]');
      const cancelBtn = document.querySelector('[data-cu-cancel]');

      const updateButtons = () => {
        const hasRoleId = Boolean(newRoleIdEl?.value?.trim());
        if (saveBtn) saveBtn.disabled = !hasRoleId;
        if (cancelBtn) cancelBtn.disabled = !(newRoleIdEl?.value || newRoleNameEl?.value);
      };

      document.querySelectorAll('[data-dataentry-close]').forEach((btn) => {
        btn.addEventListener('click', () => close());
      });

      if (newRoleIdEl) newRoleIdEl.addEventListener('input', updateButtons);
      if (newRoleNameEl) newRoleNameEl.addEventListener('input', updateButtons);

      if (saveBtn) {
        saveBtn.addEventListener('click', () => {
          if (saveBtn.disabled) return;
          window.alert('Save is a UI stub in this prototype.');
        });
      }

      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          if (cancelBtn.disabled) return;
          if (newRoleIdEl) newRoleIdEl.value = '';
          if (newRoleNameEl) newRoleNameEl.value = '';
          updateButtons();
        });
      }

      updateButtons();
    })();
