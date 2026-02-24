document.addEventListener('DOMContentLoaded', () => {
      const tabsEl = document.getElementById('securityBookingTabs');
      const behindTheSceneEl = document.getElementById('sbBehindTheScene');

      const amortizationBtn = document.getElementById('sbAmortizationBtn');
      const amortizationModalEl = document.getElementById('sbAmortizationModal');
      const amortizationFrameEl = document.getElementById('sbAmortizationFrame');

      if (amortizationBtn && amortizationModalEl) {
        const amortizationModal = new bootstrap.Modal(amortizationModalEl, {
          backdrop: 'static',
          keyboard: true
        });

        amortizationBtn.addEventListener('click', (e) => {
          e.preventDefault();
          if (amortizationFrameEl && !amortizationFrameEl.getAttribute('src')) {
            amortizationFrameEl.setAttribute('src', '../data-entry/security-booking-amortization.html');
          }
          amortizationModal.show();
        });

        amortizationModalEl.addEventListener('hidden.bs.modal', () => {
          if (amortizationFrameEl) amortizationFrameEl.removeAttribute('src');
        });
      }

      if (!tabsEl || !behindTheSceneEl) return;

      const syncBehindTheSceneVisibility = (targetSelector) => {
        const shouldHide = targetSelector === '#sb-revaluation';
        behindTheSceneEl.classList.toggle('d-none', shouldHide);
      };

      const activeTab = tabsEl.querySelector('.nav-link.active[data-bs-target]');
      if (activeTab) syncBehindTheSceneVisibility(activeTab.getAttribute('data-bs-target'));

      tabsEl.addEventListener('shown.bs.tab', (event) => {
        syncBehindTheSceneVisibility(event.target.getAttribute('data-bs-target'));
      });
    });
