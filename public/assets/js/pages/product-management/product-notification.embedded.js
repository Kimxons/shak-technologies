document.addEventListener('DOMContentLoaded', function() {
  const navigateToParent = function() {
    try {
      // Send close message to parent
      window.parent.postMessage('close', '*');
      
      // Fallback to direct parent methods
      if (window.parent && window.parent.closeChildForm) {
        window.parent.closeChildForm();
      } else if (window.parent && window.parent.closeModalWindow) {
        window.parent.closeModalWindow();
      }
    } catch (err) {
      console.error('Error navigating to parent:', err);
    }
  };

  // Get button elements
  const editBtn = document.getElementById('editBtn');
  const saveBtn = document.getElementById('saveBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const backBtn = document.getElementById('backBtn');

  // Handle Edit button
  if (editBtn) {
    editBtn.addEventListener('click', function() {
      console.log('[Product Notification] Edit button clicked');
      
      // Disable Edit button
      editBtn.disabled = true;
      
      // Enable Save and Cancel buttons
      if (saveBtn) saveBtn.disabled = false;
      if (cancelBtn) cancelBtn.disabled = false;
      
      // Enable form fields for editing
      // Add your form field enabling logic here
    });
  }

  // Handle Cancel button
  if (cancelBtn) {
    cancelBtn.addEventListener('click', function() {
      console.log('[Product Notification] Cancel button clicked');
      
      // Re-enable Edit button
      if (editBtn) editBtn.disabled = false;
      
      // Disable Save and Cancel buttons
      saveBtn.disabled = true;
      cancelBtn.disabled = true;
      
      // Disable form fields
      // Add your form field disabling logic here
    });
  }

  // Handle Back button
  if (backBtn) {
    backBtn.addEventListener('click', navigateToParent);
  }
});

