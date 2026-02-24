(function () {
      const form = document.getElementById('center-loan-scheme-form');
      if (!form) return;

      // Handle data entry navigation items
      form.querySelectorAll('[data-dataentry]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const type = btn.getAttribute('data-dataentry');
          openDataEntryModal(type);
        });
      });

      form.querySelectorAll('[data-mcs-lookup]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const which = btn.getAttribute('data-mcs-lookup');
          window.alert('Lookup (' + which + ') is a UI stub in this prototype.');
        });
      });

      form.querySelectorAll('[data-mcs-nav]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const which = btn.getAttribute('data-mcs-nav');
          window.alert('Navigate (' + which + ') is a UI stub in this prototype.');
        });
      });

      form.querySelectorAll('[data-mcs-action]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const type = btn.getAttribute('data-mcs-action');
          if (type === 'cancel') {
            const modalEl = window.frameElement?.closest?.('.modal');
            const modal = modalEl ? window.parent.bootstrap?.Modal.getOrCreateInstance(modalEl) : null;
            modal?.hide?.();
            return;
          }

          if (type === 'view') {
            window.alert('View is a UI stub in this prototype.');
            return;
          }

          window.alert(type + ' is disabled in this prototype.');
        });
      });

      // Function to open data entry modals
      function openDataEntryModal(type) {
        const modalMap = {
          'center-loan-menu': 'dataEntry/center-loan-menu.html',
          'center-loan-scheme': 'dataEntry/center-loan-scheme.html',
          'products': 'dataEntry/products.html'
        };

        const url = modalMap[type];
        if (!url) {
          window.alert('Data entry for ' + type + ' is not available.');
          return;
        }

        // Create modal backdrop
        const modalBackdrop = document.createElement('div');
        modalBackdrop.className = 'modal fade show d-block';
        modalBackdrop.style.backgroundColor = 'rgba(0,0,0,0.5)';
        modalBackdrop.style.zIndex = '1050';
        
        // Create modal dialog
        const modalDialog = document.createElement('div');
        modalDialog.className = 'modal-dialog modal-xl modal-fullscreen-lg-down';
        modalDialog.style.maxWidth = '95vw';
        modalDialog.style.height = '90vh';
        
        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        modalContent.style.height = '100%';
        
        // Create iframe
        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        
        // Assemble modal
        modalContent.appendChild(iframe);
        modalDialog.appendChild(modalContent);
        modalBackdrop.appendChild(modalDialog);
        document.body.appendChild(modalBackdrop);
        
        // Handle modal close
        const closeModal = () => {
          document.body.removeChild(modalBackdrop);
          document.body.classList.remove('modal-open');
          document.body.style.paddingRight = '';
        };
        
        // Close on backdrop click
        modalBackdrop.addEventListener('click', (e) => {
          if (e.target === modalBackdrop) {
            closeModal();
          }
        });
        
        // Close on ESC key
        const handleKeyDown = (e) => {
          if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', handleKeyDown);
          }
        };
        document.addEventListener('keydown', handleKeyDown);
        
        // Listen for close messages from iframe
        const handleMessage = (event) => {
          if (event.data && event.data.type === 'kairo-dataentry-close') {
            closeModal();
            window.removeEventListener('message', handleMessage);
          }
        };
        window.addEventListener('message', handleMessage);
        
        // Add modal-open class to body
        document.body.classList.add('modal-open');
        document.body.style.paddingRight = '17px'; // Simulate scrollbar compensation
      }
    })();
