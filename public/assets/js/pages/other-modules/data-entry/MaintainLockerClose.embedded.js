(function initMaintainLockerClose() {
      document.querySelectorAll('[data-ml-route]').forEach((btn) => {
        btn.addEventListener('click', (event) => {
          event.preventDefault();
          const route = btn.dataset.mlRoute;
          if (route) {
            window.location.href = route;
          }
        });
      });

      const back = document.querySelector('[data-ml-back]');
      if (back) {
        back.addEventListener('click', (event) => {
          event.preventDefault();
          window.location.href = '../views/MaintainLocker.html';
        });
      }
    })();
