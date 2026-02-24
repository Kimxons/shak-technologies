(function () {
      const close = () => window.parent?.postMessage?.({ type: 'kairo-dataentry-close' }, '*');

      const editBtn = document.querySelector('[data-rm-de-action="edit"]');
      const saveBtn = document.querySelector('[data-rm-de-action="save"]');
      const cancelBtn = document.querySelector('[data-rm-de-action="cancel"]');
      const editableSelectors = [
        '#AllowAdd',
        '#AllowEdit',
        '#AllowDelete',
        '#AllowOverrideRule',
        '#AllowRejection',
        '#AllowCancel',
        '#AllowClose',
        '#LimitDetails',
        '#JointLimit',
      ];

      const editableEls = editableSelectors
        .map((sel) => document.querySelector(sel))
        .filter(Boolean);

      const setEditing = (isEditing) => {
        editableEls.forEach((el) => {
          el.toggleAttribute('disabled', !isEditing);
        });

        if (saveBtn) saveBtn.disabled = !isEditing;
      };

      const resetReadonly = () => {
        setEditing(false);
      };

      document.querySelectorAll('[data-dataentry-close]').forEach((btn) => {
        btn.addEventListener('click', () => close());
      });

      if (editBtn) {
        editBtn.addEventListener('click', () => {
          setEditing(true);
        });
      }

      if (saveBtn) {
        saveBtn.addEventListener('click', () => {
          if (saveBtn.disabled) return;
          window.alert('Save is a UI stub in this prototype.');
          resetReadonly();
        });
      }

      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          resetReadonly();
        });
      }

      resetReadonly();
    })();
