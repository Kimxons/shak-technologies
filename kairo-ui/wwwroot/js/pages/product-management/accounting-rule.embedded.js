// Back Navigation with Parent Modal Restoration
    const navigateToParent = function() {
      try {
        if (window.parent && window.parent.closeModalWindow) {
          const currentModal = window.parent.document.getElementById('accountingRuleModal');
          if (currentModal) {
            window.parent.closeModalWindow(currentModal);
            setTimeout(function() {
              if (window.parent.currentOpenModal) {
                const parentModal = window.parent.document.getElementById(window.parent.currentOpenModal);
                if (parentModal) {
                  const instance = window.parent.bootstrap.Modal.getOrCreateInstance(parentModal);
                  instance.show();
                }
              }
            }, 100);
          }
        }
      } catch (err) {
        console.error('Error navigating to parent:', err);
      }
    };

    // Close modal on Escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        navigateToParent();
      }
    });
