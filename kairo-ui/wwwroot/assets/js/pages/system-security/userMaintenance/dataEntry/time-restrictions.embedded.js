(function () {
      const close = () => window.parent?.postMessage?.({ type: 'kairo-dataentry-close' }, '*');

      // Initialize grid state
      let isEditMode = false;
      
      document.querySelectorAll('[data-dataentry-close]').forEach((btn) => {
        btn.addEventListener('click', () => close());
      });

      // Time cell click handler
      document.querySelectorAll('.time-cell').forEach((cell) => {
        cell.style.cursor = 'pointer';
        cell.style.minHeight = '25px';
        cell.style.border = '1px solid #ccc';
        
        cell.addEventListener('click', () => {
          if (!isEditMode) return;
          
          if (cell.style.backgroundColor === 'rgb(0, 102, 255)' || cell.style.backgroundColor === '#0066ff') {
            // Remove permission (make it denied)
            cell.style.backgroundColor = '';
          } else {
            // Grant permission (make it blue)
            cell.style.backgroundColor = '#0066ff';
          }
          
          // If clicking on "All" row, apply to all days for that hour
          if (cell.getAttribute('data-day') === 'all') {
            const hour = cell.getAttribute('data-hour');
            const isPermitted = cell.style.backgroundColor === 'rgb(0, 102, 255)' || cell.style.backgroundColor === '#0066ff';
            
            document.querySelectorAll(`[data-hour="${hour}"]`).forEach((timeCell) => {
              if (timeCell.getAttribute('data-day') !== 'all') {
                timeCell.style.backgroundColor = isPermitted ? '#0066ff' : '';
              }
            });
          }
        });
      });

      // Action button handlers
      document.querySelectorAll('[data-tr-de-action]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const action = btn.getAttribute('data-tr-de-action');
          
          if (action === 'cancel' || action === 'back') {
            close();
            return;
          }
          
          if (action === 'edit') {
            isEditMode = !isEditMode;
            btn.textContent = isEditMode ? 'Stop Edit' : 'Edit';
            btn.classList.toggle('cm-shell__action--warning', isEditMode);
            
            // Enable/disable save button
            const saveBtn = document.querySelector('[data-tr-de-action="save"]');
            saveBtn.disabled = !isEditMode;
            
            return;
          }
          
          if (action === 'save') {
            const permittedCells = document.querySelectorAll('.time-cell[style*="background-color"]');
            console.log('Saving time restrictions for', permittedCells.length, 'time slots');
            window.alert('Time restrictions saved successfully!');
            isEditMode = false;
            btn.disabled = true;
            document.querySelector('[data-tr-de-action="edit"]').textContent = 'Edit';
            document.querySelector('[data-tr-de-action="edit"]').classList.remove('cm-shell__action--warning');
            return;
          }
          
          window.alert(action + ' is a UI stub in this prototype.');
        });
      });
      
      // Initialize save button as disabled
      const saveBtn = document.querySelector('[data-tr-de-action="save"]');
      if (saveBtn) saveBtn.disabled = true;
      
    })();
