(function () {
      const close = () => window.parent?.postMessage?.({ type: 'kairo-dataentry-close' }, '*');
      document.querySelectorAll('[data-view-close]').forEach((btn) => {
        btn.addEventListener('click', () => close());
      });
    })();
