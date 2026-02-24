(function () {
      const form = document.getElementById('user-form');
      if (!form) return;

      const popupModalEl = document.getElementById('userMaintenanceDataEntryModal');
      const popupFrame = document.getElementById('userMaintenanceDataEntryFrame');
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
        const btn = e.target.closest?.('button[data-um-open]');
        if (!btn) return;
        e.preventDefault();
        const src = btn.getAttribute('data-um-open');
        if (!src) return;
        setActiveNavItem(btn);
        openPopup(src);
      });
    })();
