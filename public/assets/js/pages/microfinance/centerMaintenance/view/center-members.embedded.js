(function () {
      const close = () => window.parent?.postMessage?.({ type: 'kairo-dataentry-close' }, '*');

      // Handle close/back buttons
      document.querySelectorAll('[data-view-close]').forEach((btn) => {
        btn.addEventListener('click', () => close());
      });

      // Handle View button
      document.querySelectorAll('[data-cu-view]').forEach((btn) => {
        btn.addEventListener('click', () => {
          // TODO: Implement view functionality
          console.log('View button clicked');
          // You can add view logic here, such as opening a detailed view of selected member
        });
      });

      // Handle Cancel button
      document.querySelectorAll('[data-cu-cancel]').forEach((btn) => {
        btn.addEventListener('click', () => {
          // TODO: Implement cancel functionality
          console.log('Cancel button clicked');
          // You can add cancel logic here, such as clearing selections or resetting state
        });
      });
    })();
