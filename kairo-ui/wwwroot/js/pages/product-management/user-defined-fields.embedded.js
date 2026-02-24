document.addEventListener('DOMContentLoaded', function() {
      const navigateToParent = function() {
        try {
          // Try to close via iframe parent communication
          if (window.parent && window.parent !== window) {
            // Send close message to parent
            window.parent.postMessage('close', '*');
            
            // Also try direct methods
            if (window.parent.closeChildForm) {
              window.parent.closeChildForm();
            } else if (window.parent.closeModalWindow) {
              window.parent.closeModalWindow();
            }
          }
        } catch (err) {
          console.error('Error navigating to parent:', err);
        }
      };

      // Handle Back button
      const backBtn = document.getElementById('backBtn');
      if (backBtn) {
        backBtn.addEventListener('click', navigateToParent);
      }
    });
