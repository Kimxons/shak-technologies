(function wireNotificationAttachment() {
      const cancelBtn = document.querySelector('[data-na-cancel]');
      cancelBtn?.addEventListener('click', (event) => {
        event.preventDefault();
        const url = new URL('../views/NotificationFormats.html', window.location.href);
        url.searchParams.set('t', String(Date.now()));
        window.location.href = url.toString();
      });
    })();
