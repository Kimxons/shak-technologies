(function wireNotificationFormats() {
      const cancelBtn = document.querySelector('[data-nf-cancel]');
      const subject = document.getElementById('subject');
      const message = document.getElementById('messageBody');
      const subjectParam = document.getElementById('subjectParam');
      const messageParam = document.getElementById('messageParam');

      cancelBtn?.addEventListener('click', (event) => {
        event.preventDefault();

        // Close the dashboard modal if this page is loaded inside it.
        try {
          const parentWin = window.parent;
          if (parentWin && parentWin !== window) {
            const modalEl = parentWin.document?.getElementById('notificationFormatsModal');
            if (modalEl && parentWin.bootstrap?.Modal) {
              parentWin.bootstrap.Modal.getOrCreateInstance(modalEl).hide();
              return;
            }
          }
        } catch {
          // ignore cross-origin / access issues
        }

        // Fallback: stay within the module and just ensure we're on the main formats page.
        const url = new URL(window.location.href);
        url.searchParams.set('t', String(Date.now()));
        window.location.href = url.toString();
      });

      const insertAtCursor = (input, value) => {
        if (!input || !value) return;
        const start = input.selectionStart ?? input.value.length;
        const end = input.selectionEnd ?? input.value.length;
        const before = input.value.slice(0, start);
        const after = input.value.slice(end);
        input.value = `${before}${value}${after}`;
        const nextPos = start + value.length;
        input.setSelectionRange?.(nextPos, nextPos);
        input.focus();
      };

      document.querySelectorAll('[data-insert]')?.forEach((btn) => {
        btn.addEventListener('click', () => {
          const target = btn.getAttribute('data-insert');
          if (target === 'subject') {
            insertAtCursor(subject, subjectParam?.value);
          } else {
            insertAtCursor(message, messageParam?.value);
          }
        });
      });
    })();
