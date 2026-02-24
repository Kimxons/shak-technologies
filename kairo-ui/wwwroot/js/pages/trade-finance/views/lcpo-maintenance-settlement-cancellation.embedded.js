(function () {
      const navItems = document.querySelectorAll('[data-lcpo-ms-nav]');
      navItems.forEach((item) => {
        item.addEventListener('click', () => {
          const target = item.getAttribute('data-lcpo-ms-nav');
          if (target === 'portfolio') {
            try {
              const parentWin = window.parent;
              if (parentWin && parentWin !== window) {
                const modalEl = parentWin.document?.getElementById('lcPortfolioModal');
                if (modalEl && parentWin.bootstrap?.Modal) {
                  parentWin.bootstrap.Modal.getOrCreateInstance(modalEl).show();
                  return;
                }
              }
            } catch {
              // ignore
            }

            // Fallback: open as a full page if not inside the dashboard iframe.
            window.location.href = 'lc-portfolio.html';
            return;
          }

          navItems.forEach((btn) => btn.classList.remove('is-active'));
          item.classList.add('is-active');
        });
      });
    })();
