(function () {
      const close = () => window.parent?.postMessage?.({ type: 'kairo-dataentry-close' }, '*');

      document.querySelectorAll('[data-dataentry-close]').forEach((btn) => {
        btn.addEventListener('click', () => close());
      });

      document.querySelectorAll('[data-ter-de-action]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const action = btn.getAttribute('data-ter-de-action');
          
          if (action === 'cancel' || action === 'back') {
            close();
            return;
          }
          
          if (action === 'edit') {
            // Toggle edit mode for IP address fields
            const ipFields = document.querySelectorAll('[id^="IPAddress"]');
            const isReadonly = ipFields[0].readOnly;
            
            ipFields.forEach(field => {
              field.readOnly = !isReadonly;
              field.classList.toggle('form-control-plaintext', isReadonly);
              field.classList.toggle('form-control', !isReadonly);
            });
            
            btn.textContent = isReadonly ? 'Stop Edit' : 'Edit';
            btn.classList.toggle('cm-shell__action--warning', !isReadonly);
            
            // Enable/disable save button
            const saveBtn = document.querySelector('[data-ter-de-action="save"]');
            saveBtn.disabled = isReadonly;
            
            return;
          }
          
          if (action === 'save') {
            // Save IP addresses
            const ipAddresses = [];
            for (let i = 1; i <= 5; i++) {
              const field = document.getElementById('IPAddress' + i);
              if (field.value.trim()) {
                ipAddresses.push(field.value.trim());
              }
            }
            
            console.log('Saving terminal restrictions:', ipAddresses);
            window.alert('Terminal restrictions saved successfully!');
            
            // Reset edit mode
            const ipFields = document.querySelectorAll('[id^="IPAddress"]');
            ipFields.forEach(field => {
              field.readOnly = true;
              field.classList.add('form-control-plaintext');
              field.classList.remove('form-control');
            });
            
            document.querySelector('[data-ter-de-action="edit"]').textContent = 'Edit';
            document.querySelector('[data-ter-de-action="edit"]').classList.remove('cm-shell__action--warning');
            btn.disabled = true;
            
            return;
          }
          
          window.alert(action + ' is a UI stub in this prototype.');
        });
      });
      
      // Initialize IP address fields as readonly initially
      document.querySelectorAll('[id^="IPAddress"]').forEach(field => {
        field.readOnly = true;
        field.classList.add('form-control-plaintext');
        field.classList.remove('form-control');
      });
      
      // Initialize save button as disabled
      const saveBtn = document.querySelector('[data-ter-de-action="save"]');
      if (saveBtn) saveBtn.disabled = true;
      
    })();
