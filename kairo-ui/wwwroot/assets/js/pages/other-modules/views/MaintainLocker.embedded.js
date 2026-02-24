(function initMaintainLockerRouting() {
      document.querySelectorAll('[data-ml-route]').forEach((btn) => {
        btn.addEventListener('click', (event) => {
          event.preventDefault();
          const route = btn.dataset.mlRoute;
          if (route) {
            window.location.href = route;
          }
        });
      });
    })();
