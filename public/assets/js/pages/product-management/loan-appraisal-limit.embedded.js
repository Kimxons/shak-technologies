// Loan Appraisal Limit Form JavaScript
(function () {
  const backBtn = document.getElementById('backBtn');
  
  // Back Navigation - Close the child form overlay
  if (backBtn) {
    backBtn.addEventListener('click', function() {
      try {
        if (window.parent && window.parent.closeChildForm) {
          window.parent.closeChildForm();
        } else {
          // Fallback: send message to parent
          window.parent.postMessage('close', '*');
        }
      } catch (err) {
        console.error('Error closing form:', err);
      }
    });
  }

  // Action button handlers
  const newBtn = document.getElementById('newBtn');
  const alterBtn = document.getElementById('alterBtn');
  const updateBtn = document.getElementById('updateBtn');
  const removeBtn = document.getElementById('removeBtn');
  const clearBtn = document.getElementById('clearBtn');

  if (newBtn) {
    newBtn.addEventListener('click', function() {
      // Clear all form fields
      document.getElementById('roleId').value = '';
      document.getElementById('lowerLimitAmount').value = '';
      document.getElementById('upperLimitAmount').value = '';
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', function() {
      // Clear all form fields
      document.getElementById('roleId').value = '';
      document.getElementById('lowerLimitAmount').value = '';
      document.getElementById('upperLimitAmount').value = '';
    });
  }

  if (updateBtn) {
    updateBtn.addEventListener('click', function() {
      // Here you would typically add the row to the table
      alert('Update functionality would add the current values to the table');
    });
  }

  // Initialize
  document.addEventListener('DOMContentLoaded', function() {
    // Form is read-only by default
  });
})();

    saveRightBtn.addEventListener('click', function() {
      if (!saveRightBtn.disabled) {
        isEditMode = false;
        editBtn.disabled = false;
        editBtn.style.opacity = '1';
        editBtn.style.cursor = 'pointer';
        viewBtn.disabled = false;
        viewBtn.style.opacity = '1';
        viewBtn.style.cursor = 'pointer';
        saveRightBtn.disabled = true;
        saveRightBtn.style.color = '#999';
        saveRightBtn.style.opacity = '0.6';
        saveRightBtn.style.cursor = 'not-allowed';
        cancelRightBtn.disabled = true;
        cancelRightBtn.style.color = '#999';
        cancelRightBtn.style.opacity = '0.6';
        cancelRightBtn.style.cursor = 'not-allowed';
        // Disable form controls
        document.querySelectorAll('input[type="text"], select').forEach(el => {
          el.disabled = true;
        });
        alert('Changes saved successfully.');
      }
    });

    // Back Navigation with Parent Modal Restoration
    const navigateToParent = function() {
      try {
        if (window.parent && window.parent.closeModalWindow) {
          const currentModal = window.parent.document.getElementById('loanAppraisalLimitModal');
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

    // Make close buttons navigate to parent
    document.addEventListener('DOMContentLoaded', function() {
      // Check if this is opened in a modal (parent window exists)
      if (window.parent !== window) {
        // Disable form controls by default
        document.querySelectorAll('input[type="text"], select').forEach(el => {
          el.disabled = true;
        });
        
        // Override window close function to navigate to parent
        window.closeModalWindow = navigateToParent;
      }
    });
