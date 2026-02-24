(function () {
      const form = document.getElementById('center-member-maintenance-form');
      if (!form) return;

      const popupModalEl = document.getElementById('centerMemberMaintenanceDataEntryModal');
      const popupFrame = document.getElementById('centerMemberMaintenanceDataEntryFrame');
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
          // Accept close message from the popup iframe
          // Validate that message comes from a child iframe (could be from popupFrame or nested iframes)
          try {
            // Check if event source is our popup frame or a frame within our popup
            if (event.source === popupFrame.contentWindow || 
                (popupFrame.contentWindow && event.source?.parent === popupFrame.contentWindow)) {
              closePopup();
            }
          } catch (e) {
            // If source validation fails due to cross-origin, still close if message type matches
            // This is safe because we already checked the message type above
            if (event.origin === window.location.origin) {
              closePopup();
            }
          }
        });
      }

      const setActiveNavItem = (btn) => {
        const items = btn.closest('.cm-nav-items');
        if (!items) return;
        items.querySelectorAll('.cm-legacy-nav__item').forEach((el) => el.classList.remove('is-active'));
        btn.classList.add('is-active');
      };

      form.querySelector('.cm-legacy-nav')?.addEventListener('click', (e) => {
        const btn = e.target.closest?.('button[data-cmm-open]');
        if (!btn) return;
        e.preventDefault();
        const src = btn.getAttribute('data-cmm-open');
        if (!src) return;

        // Validation: Check if master screen is in View Mode and has valid Series & Reference No
        // Access parent window's form state and field values
        const referenceNoInput = window.parent?.document?.getElementById('ReferenceNo');
        const seriesInput = window.parent?.document?.getElementById('Series');

        const referenceNo = String(referenceNoInput?.value || '').trim();
        const series = String(seriesInput?.value || '').trim();
        
        // Get the parent window's currentFormState (exposed via window object)
        const parentFormState = window.parent?.currentFormState;

        // Only allow opening child screens if:
        // 1. Master is in 'edit' mode (which means a record is loaded and viewed)
        // 2. AND Reference No is not blank
        // 3. AND Series is not blank
        if (parentFormState !== 'edit' || !referenceNo || !series) {
          window.alert('Master record must be in View Mode with valid Reference No and Series to access this screen.');
          return;
        }

        setActiveNavItem(btn);
        openPopup(src);
      });

      form.querySelectorAll('[data-cmm-lookup]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const which = btn.getAttribute('data-cmm-lookup');
          window.alert('Lookup (' + which + ') is a UI stub in this prototype.');
        });
      });

      form.querySelectorAll('[data-cmm-nav]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const which = btn.getAttribute('data-cmm-nav');
          
          // Determine direction: previous = -1, next = 1
          let direction = 0;
          if (which === 'previous') {
            direction = -1;
          } else if (which === 'next') {
            direction = 1;
          }
          
          // Call the parent window's viewMemberMaintence function with direction
          if (window.parent?.viewMemberMaintence) {
            window.parent.viewMemberMaintence(direction);
          } else {
            window.alert('Navigate (' + which + ') is not yet fully integrated.');
          }
        });
      });

      form.querySelectorAll('[data-cmm-action]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const type = btn.getAttribute('data-cmm-action');
          if (type === 'cancel') {
            const modalEl = window.frameElement?.closest?.('.modal');
            const modal = modalEl ? window.parent.bootstrap?.Modal.getOrCreateInstance(modalEl) : null;
            modal?.hide?.();
            
            // Disable navigation and reinstate buttons on cancel
            const previousBtn = form.querySelector('[data-cmm-nav="previous"]');
            const nextBtn = form.querySelector('[data-cmm-nav="next"]');
            const reinstateBtn = form.querySelector('[data-cmm-action="reinstate"]');
            if (previousBtn) previousBtn.disabled = true;
            if (nextBtn) nextBtn.disabled = true;
            if (reinstateBtn) reinstateBtn.disabled = true;
            
            return;
          }

          if (type === 'view') {
            return; // handled by main page script
          }

          if (type === 'add' || type === 'reinstate') {
            window.alert(type.charAt(0).toUpperCase() + type.slice(1) + ' is a UI stub in this prototype.');
            return;
          }

          window.alert(type + ' is disabled in this prototype.');
        });
      });
    })();
