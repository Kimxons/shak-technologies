(() => {
  const inferAction = (btn) => {
    const iconClass = btn.querySelector('i')?.className || '';
    if (iconClass.includes('arrow-clockwise')) return 'refresh';
    if (iconClass.includes('dash')) return 'minimize';
    if (iconClass.includes('square')) return 'maximize';
    if (iconClass.includes('x')) return 'close';
    return null;
  };

  const findHostModalInParent = () => {
    try {
      const parentDoc = window.parent?.document;
      if (!parentDoc || window.parent === window) return null;

      const iframes = Array.from(parentDoc.querySelectorAll('iframe'));
      const hostFrame = iframes.find((frame) => frame.contentWindow === window);
      return hostFrame?.closest?.('.legacy-modal') || null;
    } catch {
      return null;
    }
  };

  const tryDispatchWindowAction = (action) => {
    const hostModal = findHostModalInParent();
    const parentWin = window.parent;

    try {
      const control = hostModal?.querySelector?.(`[data-window-action="${action}"]`);
      if (control) {
        control.click();
        return true;
      }

      if (action === 'close' && hostModal && typeof parentWin?.closeModalWindow === 'function') {
        parentWin.closeModalWindow(hostModal);
        return true;
      }
    } catch {
      // ignore
    }

    return false;
  };

  const restoreParentModalIfAny = () => {
    try {
      const parentWin = window.parent;
      const modalId = parentWin?.currentOpenModal;
      if (!modalId) return;

      const modalEl = parentWin.document?.getElementById(modalId);
      if (!modalEl) return;

      const bs = parentWin.bootstrap;
      if (!bs?.Modal) return;

      const instance = bs.Modal.getOrCreateInstance(modalEl);
      instance.show();
    } catch {
      // ignore
    }
  };

  const init = () => {
    const titleBar = document.querySelector('.tf-title-bar');
    if (!titleBar) return;

    document.querySelectorAll('.tf-title-btn').forEach((btn) => {
      const action = btn.dataset.action || inferAction(btn);
      if (!action) return;

      btn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (action === 'refresh') {
          window.location.reload();
          return;
        }

        if (action === 'minimize' || action === 'maximize' || action === 'close') {
          const handled = tryDispatchWindowAction(action);
          if (action === 'close') {
            // Fallbacks for non-modal contexts
            if (!handled) {
              if (window.history.length > 1) window.history.back();
              else window.close();
            }

            // In the legacy modal shell, re-open the previous menu/modal if tracked.
            setTimeout(restoreParentModalIfAny, 120);
          }
        }
      });
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
