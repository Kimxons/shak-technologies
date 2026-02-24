document.addEventListener('DOMContentLoaded', function() {
      // Helper to open inline "modal"
      function openInlineModal(url) {
        const mainContent = document.getElementById('main-product-content');
        const container = document.getElementById('data-entry-container');
        const iframe = document.getElementById('data-entry-iframe');

        if (mainContent && container && iframe) {
          mainContent.classList.add('d-none');
          container.classList.remove('d-none');
          // Append ?inline=true to URL
          const separator = url.includes('?') ? '&' : '?';
          iframe.src = url + separator + 'inline=true';
        }
      }

      // Exposed global for child pages to call
      window.closeModalWindow = function () {
        const mainContent = document.getElementById('main-product-content');
        const container = document.getElementById('data-entry-container');
        const iframe = document.getElementById('data-entry-iframe');

        if (mainContent && container && iframe) {
          container.classList.add('d-none');
          mainContent.classList.remove('d-none');
          iframe.src = ''; // Clear source to stop processing
        }
      };

      // Get all Data Entry nav items
      const navItems = document.querySelectorAll('.cm-legacy-nav__item');

      const subModules = [
        { name: 'Product GL Interface', url: 'product-gl-interface.html', modalId: 'productGLInterfaceModal' },
        { name: 'Product Documents', url: 'product-documents.html', modalId: 'productDocumentsModal' },
        { name: 'User Defined Fields', url: 'user-defined-fields.html', modalId: 'userDefinedFieldsModal' },
        { name: 'Product Charges', url: 'product-charges.html', modalId: 'productChargesModal' }
      ];

      navItems.forEach(btn => {
        const foundModule = subModules.find(m => btn.textContent.includes(m.name));
        if (foundModule) {
          btn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Opening inline:', foundModule.name);
            openInlineModal(foundModule.url);
          });
        }
      });
    });
