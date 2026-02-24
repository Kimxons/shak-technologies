(function () {
      const form = document.getElementById('center-maintenance-form');
      if (!form) return;

      const popupModalEl = document.getElementById('centerMaintenanceDataEntryModal');
      const popupFrame = document.getElementById('centerMaintenanceDataEntryFrame');
      const popupModal = popupModalEl ? bootstrap.Modal.getOrCreateInstance(popupModalEl) : null;

      const getOuterModalId = () => window.frameElement?.closest?.('.modal')?.id || null;
      const setOuterModalLocked = (locked) => {
        const modalId = getOuterModalId();
        if (!modalId) return;
        window.parent?.postMessage?.({ type: 'kairo-modal-lock', modalId, locked }, '*');
      };

      const openPopup = (src) => {
        if (!popupModal || !popupFrame) return;
        popupFrame.src = src;
        setOuterModalLocked(true);
        popupModal.show();
      };

      const closePopup = () => {
        if (!popupModal) return;
        popupModal.hide();
      };

      if (popupModalEl && popupFrame) {
        popupModalEl.addEventListener('hidden.bs.modal', () => {
          popupFrame.src = 'about:blank';
          setOuterModalLocked(false);
        });

        window.addEventListener('message', (event) => {
          if (event?.data?.type !== 'kairo-dataentry-close') return;
          if (event.source !== popupFrame.contentWindow) return;
          closePopup();
        });
      }

      const setActiveNavItem = (btn) => {
        const items = btn.closest('.cm-nav-items');
        if (!items) return;
        items.querySelectorAll('.cm-legacy-nav__item').forEach((el) => el.classList.remove('is-active'));
        btn.classList.add('is-active');
      };

      form.querySelector('.cm-legacy-nav')?.addEventListener('click', (e) => {
        const btn = e.target.closest?.('button[data-mcn-open]');
        if (!btn) return;
        e.preventDefault();
        const src = btn.getAttribute('data-mcn-open');
        if (!src) return;
        setActiveNavItem(btn);
        openPopup(src);
      });

      form.querySelectorAll('[data-mcn-lookup]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const which = btn.getAttribute('data-mcn-lookup');
          window.alert('Lookup (' + which + ') is a UI stub in this prototype.');
        });
      });

      form.querySelectorAll('[data-mcn-nav]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const which = btn.getAttribute('data-mcn-nav');
          window.alert('Navigate (' + which + ') is a UI stub in this prototype.');
        });
      });

      form.querySelectorAll('[data-mcn-action]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const type = btn.getAttribute('data-mcn-action');
          if (type === 'cancel') {
            const modalEl = window.frameElement?.closest?.('.modal');
            const modal = modalEl ? window.parent.bootstrap?.Modal.getOrCreateInstance(modalEl) : null;
            modal?.hide?.();
            return;
          }

          if (type === 'view' || type === 'add') {
            window.alert(type.charAt(0).toUpperCase() + type.slice(1) + ' is a UI stub in this prototype.');
            return;
          }

          window.alert(type + ' is disabled in this prototype.');
        });
      });
    })();
