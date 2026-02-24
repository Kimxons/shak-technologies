// Change Password Module - System Utilities

document.addEventListener('DOMContentLoaded', function() {
  initializeChangePassword();
});

function initializeChangePassword() {
  const form = document.getElementById('changePasswordForm');
  const okBtn = document.getElementById('okBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const oldPasswordInput = document.getElementById('oldPassword');
  const newPasswordInput = document.getElementById('newPassword');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const passwordMessage = document.getElementById('passwordMessage');
  const successMessage = document.getElementById('successMessage');

  // Get current user from session or local storage
  const currentUser = localStorage.getItem('currentUser') || 'CSADM';
  document.getElementById('userName').value = currentUser;

  // OK Button Click Handler
  okBtn.addEventListener('click', function(e) {
    e.preventDefault();
    handlePasswordChange();
  });

  // Cancel Button Click Handler
  cancelBtn.addEventListener('click', function(e) {
    e.preventDefault();
    handleCancel();
  });

  // Real-time password validation
  confirmPasswordInput.addEventListener('input', function() {
    validatePasswordMatch();
  });

  newPasswordInput.addEventListener('input', function() {
    validatePasswordMatch();
  });

  function validatePasswordMatch() {
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    hideMessages();

    if (confirmPassword.length > 0) {
      if (newPassword !== confirmPassword) {
        showError('Passwords do not match');
        return false;
      }
    }
    return true;
  }

  function validateForm() {
    const oldPassword = oldPasswordInput.value.trim();
    const newPassword = newPasswordInput.value.trim();
    const confirmPassword = confirmPasswordInput.value.trim();

    hideMessages();

    if (!oldPassword) {
      showError('Please enter your old password');
      oldPasswordInput.focus();
      return false;
    }

    if (!newPassword) {
      showError('Please enter a new password');
      newPasswordInput.focus();
      return false;
    }

    if (newPassword.length < 6) {
      showError('New password must be at least 6 characters long');
      newPasswordInput.focus();
      return false;
    }

    if (!confirmPassword) {
      showError('Please confirm your new password');
      confirmPasswordInput.focus();
      return false;
    }

    if (newPassword !== confirmPassword) {
      showError('Passwords do not match');
      confirmPasswordInput.focus();
      return false;
    }

    if (oldPassword === newPassword) {
      showError('New password must be different from old password');
      newPasswordInput.focus();
      return false;
    }

    return true;
  }

  function handlePasswordChange() {
    if (!validateForm()) {
      return;
    }

    const oldPassword = oldPasswordInput.value;
    const newPassword = newPasswordInput.value;

    // Show loading state
    okBtn.disabled = true;
    okBtn.textContent = 'Processing...';

    // Simulate API call
    setTimeout(function() {
      // In a real application, this would make an API call
      // For now, we'll simulate a successful password change

      try {
        // Simulate password change logic
        const success = true; // Replace with actual API call result

        if (success) {
          showSuccess('Password changed successfully!');

          // Clear form after success
          setTimeout(function() {
            clearForm();
            // Close modal if in modal context
            if (window.parent && window.parent.bootstrap) {
              const modal = window.parent.document.getElementById('changePasswordModal');
              if (modal) {
                const bsModal = window.parent.bootstrap.Modal.getInstance(modal);
                if (bsModal) {
                  bsModal.hide();
                }
              }
            }
          }, 1500);
        } else {
          showError('Failed to change password. Please check your old password.');
        }
      } catch (error) {
        showError('An error occurred. Please try again.');
      } finally {
        okBtn.disabled = false;
        okBtn.textContent = 'OK';
      }
    }, 1000);
  }

  function handleCancel() {
    if (confirm('Are you sure you want to cancel? All changes will be lost.')) {
      clearForm();

      // Close modal if in modal context
      if (window.parent && window.parent.bootstrap) {
        const modal = window.parent.document.getElementById('changePasswordModal');
        if (modal) {
          const bsModal = window.parent.bootstrap.Modal.getInstance(modal);
          if (bsModal) {
            bsModal.hide();
          }
        }
      }
    }
  }

  function clearForm() {
    form.reset();
    hideMessages();
    oldPasswordInput.value = '';
    newPasswordInput.value = '';
    confirmPasswordInput.value = '';
  }

  function showError(message) {
    passwordMessage.textContent = message;
    passwordMessage.style.display = 'block';
    successMessage.style.display = 'none';
  }

  function showSuccess(message) {
    successMessage.textContent = message;
    successMessage.style.display = 'block';
    passwordMessage.style.display = 'none';
  }

  function hideMessages() {
    passwordMessage.style.display = 'none';
    successMessage.style.display = 'none';
  }

  // Handle Enter key press
  form.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handlePasswordChange();
    }
  });
}

