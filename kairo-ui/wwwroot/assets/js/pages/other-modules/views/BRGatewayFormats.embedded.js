(function initBrGatewayFormatsRouting() {
      document.querySelectorAll('[data-brgf-route]').forEach((btn) => {
        btn.addEventListener('click', (event) => {
          event.preventDefault();
          const route = btn.dataset.brgfRoute;
          if (route) {
            window.location.href = route;
          }
        });
      });

      document.querySelectorAll('[data-brgf-toggle]').forEach((btn) => {
        btn.addEventListener('click', (event) => {
          event.preventDefault();
          const toggleKey = btn.dataset.brgfToggle;
          if (!toggleKey) return;
          const target = document.querySelector(`[data-brgf-subnav="${toggleKey}"]`);
          if (!target) return;

          const willOpen = target.hidden;
          target.hidden = !willOpen;
          btn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
          btn.classList.toggle('is-open', willOpen);
        });
      });
    })();
