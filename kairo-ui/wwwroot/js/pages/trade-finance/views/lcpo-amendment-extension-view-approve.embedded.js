(function () {
      const applicationTabTrigger = document.getElementById('application-tab');
      const applicationPane = document.getElementById('application');

      const termsTabTrigger = document.getElementById('terms-tab');
      const termsPane = document.getElementById('terms');

      const shipingTabTrigger = document.getElementById('shiping-tab');
      const shipingPane = document.getElementById('shiping');

      const renderFieldChangeGrid = (paneEl) => {
        if (!paneEl) return;
        if (paneEl.dataset.loaded === 'true') return;
        paneEl.dataset.loaded = 'true';

        paneEl.innerHTML = `
          <div class="lcpo-grid-wrapper">
            <table class="table table-sm lcpo-grid-table">
              <thead>
                <tr>
                  <th scope="col">FieldName</th>
                  <th scope="col">OldValue</th>
                  <th scope="col">NewValue</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colspan="3" class="lcpo-empty">No records to display.</td>
                </tr>
              </tbody>
            </table>
          </div>
        `;
      };

      applicationTabTrigger?.addEventListener('shown.bs.tab', () => renderFieldChangeGrid(applicationPane));
      termsTabTrigger?.addEventListener('shown.bs.tab', () => renderFieldChangeGrid(termsPane));
      shipingTabTrigger?.addEventListener('shown.bs.tab', () => renderFieldChangeGrid(shipingPane));
    })();

    (function () {
      const chargesButton = document.getElementById('lcpoChargesBtn');
      const chargesModalEl = document.getElementById('lcAmendmentChargesModal');
      if (!chargesButton || !chargesModalEl) return;

      const getDialogEl = () => chargesModalEl.querySelector('.modal-dialog');

      const getBootstrap = () => {
        try {
          return globalThis.bootstrap;
        } catch {
          return undefined;
        }
      };

      const ensureFallbackBackdrop = () => {
        const existing = document.getElementById('lcpo-charges-backdrop');
        if (existing) return existing;

        const backdrop = document.createElement('div');
        backdrop.id = 'lcpo-charges-backdrop';
        backdrop.className = 'modal-backdrop fade show';
        backdrop.addEventListener('click', () => hideChargesFallback());
        document.body.appendChild(backdrop);
        return backdrop;
      };

      const showChargesFallback = () => {
        chargesModalEl.style.display = 'block';
        chargesModalEl.classList.add('show');
        chargesModalEl.removeAttribute('aria-hidden');
        chargesModalEl.setAttribute('aria-modal', 'true');
        chargesModalEl.setAttribute('role', 'dialog');
        document.body.classList.add('modal-open');
        document.body.style.overflow = 'hidden';
        ensureFallbackBackdrop();
      };

      const hideChargesFallback = () => {
        chargesModalEl.classList.remove('show');
        chargesModalEl.style.display = 'none';
        chargesModalEl.setAttribute('aria-hidden', 'true');
        chargesModalEl.removeAttribute('aria-modal');
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';

        document.getElementById('lcpo-charges-backdrop')?.remove();
        getDialogEl()?.classList.remove('is-maximized');
      };

      const showCharges = () => {
        const bs = getBootstrap();
        if (bs?.Modal?.getOrCreateInstance) {
          bs.Modal.getOrCreateInstance(chargesModalEl, {
            backdrop: true,
            keyboard: true,
            focus: true
          }).show();
          return;
        }

        showChargesFallback();
      };

      const hideCharges = () => {
        const bs = getBootstrap();
        if (bs?.Modal?.getOrCreateInstance) {
          bs.Modal.getOrCreateInstance(chargesModalEl).hide();
          return;
        }

        hideChargesFallback();
      };

      chargesModalEl.addEventListener('hidden.bs.modal', () => {
        getDialogEl()?.classList.remove('is-maximized');
      });

      chargesModalEl.addEventListener('click', (event) => {
        const control = event.target?.closest?.('[data-lcpo-window]');
        if (!control) {
          // Fallback: clicking the shaded area closes the modal.
          if (event.target === chargesModalEl && !getBootstrap()?.Modal?.getOrCreateInstance) {
            hideChargesFallback();
          }
          return;
        }

        const action = control.getAttribute('data-lcpo-window');
        const dialog = getDialogEl();

        if (action === 'maximize') {
          dialog?.classList.toggle('is-maximized');
          return;
        }

        if (action === 'minimize' || action === 'close') {
          hideCharges();
        }
      });

      document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        if (!chargesModalEl.classList.contains('show')) return;
        // If Bootstrap is active it handles Esc; fallback handles it here.
        if (!getBootstrap()?.Modal?.getOrCreateInstance) hideChargesFallback();
      });

      chargesButton.addEventListener('click', () => {
        showCharges();
      });
    })();
