(function () {
      const backBtn = document.getElementById('lcPortfolioBackBtn');
      backBtn?.addEventListener('click', () => {
        try {
          const parentWin = window.parent;
          if (parentWin && parentWin !== window) {
            const modalEl = parentWin.document?.getElementById('lcPortfolioModal');
            if (modalEl && parentWin.bootstrap?.Modal) {
              parentWin.bootstrap.Modal.getOrCreateInstance(modalEl).hide();
              return;
            }
          }
        } catch {
          // ignore
        }

        if (window.history.length > 1) window.history.back();
      });
    })();
