(function initBrGatewayFormatsFolderInfo() {
      document.querySelectorAll('[data-brgf-route]').forEach((btn) => {
        btn.addEventListener('click', (event) => {
          event.preventDefault();
          const route = btn.dataset.brgfRoute;
          if (route) window.location.href = route;
        });
      });

      const back = document.querySelector('[data-brgf-back]');
      if (back) {
        back.addEventListener('click', (event) => {
          event.preventDefault();
          window.location.href = '../views/BRGatewayFormats.html';
        });
      }

      const toggles = document.querySelectorAll('[data-brgf-toggle]');
      toggles.forEach((btn) => {
        btn.addEventListener('click', (event) => {
          event.preventDefault();
          const toggleKey = btn.dataset.brgfToggle;
          if (!toggleKey) return;
          const target = document.querySelector(`[data-brgf-subnav="${toggleKey}"]`);
          if (!target) return;
          const willOpen = target.hasAttribute('hidden');
          if (willOpen) {
            target.removeAttribute('hidden');
          } else {
            target.setAttribute('hidden', '');
          }
          btn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
          btn.classList.toggle('is-open', willOpen);
        });
      });
    })();
