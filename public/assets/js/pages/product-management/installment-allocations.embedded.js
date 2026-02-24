// Edit/Save Mode Toggle
(function () {
  const editBtn = document.getElementById('editBtn');
  const saveBtn = document.getElementById('saveBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const backBtn = document.getElementById('backBtn');
  let isEditMode = false;

  if (editBtn) {
    editBtn.addEventListener('click', function() {
      isEditMode = true;
      editBtn.classList.add('hidden');
      saveBtn.classList.remove('hidden');
      cancelBtn.classList.remove('hidden');
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', function() {
      isEditMode = false;
      editBtn.classList.remove('hidden');
      saveBtn.classList.add('hidden');
      cancelBtn.classList.add('hidden');
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', function() {
      isEditMode = false;
      editBtn.classList.remove('hidden');
      saveBtn.classList.add('hidden');
      cancelBtn.classList.add('hidden');
      // Here you would typically save the form data
      // For now, just close the form
      if (window.parent && window.parent.closeChildForm) {
        window.parent.closeChildForm();
      }
    });
  }

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

  // Initialize
  document.addEventListener('DOMContentLoaded', function() {
    // Form is read-only by default
  });
})();
