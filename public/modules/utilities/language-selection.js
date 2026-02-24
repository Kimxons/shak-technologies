// Language Setup Module - System Utilities

document.addEventListener('DOMContentLoaded', function() {
  initializeLanguageSetup();
  initializeSidebar();
});

function initializeLanguageSetup() {
  const form = document.getElementById('languageSetupForm');
  const saveBtn = document.querySelector('[data-action="save-language"]');
  const cancelBtn = document.querySelector('[data-action="cancel-language"]');
  const currentLanguageInput = document.getElementById('currentLanguage');
  const newLanguageSelect = document.getElementById('newLanguage');
  const statusMessage = document.getElementById('statusMessage');

  // Set current language
  currentLanguageInput.value = 'English';

  // Save button click handler
  saveBtn.addEventListener('click', function(e) {
    e.preventDefault();
    handleLanguageChange();
  });

  // Cancel button click handler
  cancelBtn.addEventListener('click', function(e) {
    e.preventDefault();
    handleCancel();
  });

  function handleLanguageChange() {
    const selectedLanguage = newLanguageSelect.value.trim();

    // Validate selection
    if (!selectedLanguage) {
      showError('Please select a language');
      newLanguageSelect.focus();
      return;
    }

    if (selectedLanguage === currentLanguageInput.value.toLowerCase()) {
      showWarning('Selected language is the same as current language');
      return;
    }

    // Show loading state
    saveBtn.disabled = true;
    const originalContent = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="bi bi-hourglass-split" aria-hidden="true"></i><span>Saving...</span>';

    // Simulate API call
    setTimeout(function() {
      try {
        // Simulate language change logic
        const success = true;

        if (success) {
          // Get the selected language text
          const selectedText = newLanguageSelect.options[newLanguageSelect.selectedIndex].text;
          
          // Update current language
          currentLanguageInput.value = selectedText;
          
          // Clear selection
          newLanguageSelect.value = '';
          
          showSuccess(`Language changed to ${selectedText} successfully`);
          
          // In a real application, you might want to reload or update the UI language here
          // window.location.reload();
        } else {
          showError('Failed to change language. Please try again.');
        }
      } catch (error) {
        showError('An error occurred while changing language.');
      } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalContent;
      }
    }, 1000);
  }

  function handleCancel() {
    // Reset the form
    newLanguageSelect.value = '';
    hideMessages();
    showInfo('Form cleared');
  }

  function showError(message) {
    statusMessage.className = 'status error';
    statusMessage.querySelector('.status-text').textContent = message;
    statusMessage.querySelector('.bi').className = 'bi bi-exclamation-circle-fill';
    statusMessage.classList.remove('hidden');
  }

  function showSuccess(message) {
    statusMessage.className = 'status success';
    statusMessage.querySelector('.status-text').textContent = message;
    statusMessage.querySelector('.bi').className = 'bi bi-check-circle-fill';
    statusMessage.classList.remove('hidden');
  }

  function showWarning(message) {
    statusMessage.className = 'status warning';
    statusMessage.querySelector('.status-text').textContent = message;
    statusMessage.querySelector('.bi').className = 'bi bi-exclamation-triangle-fill';
    statusMessage.classList.remove('hidden');
  }

  function showInfo(message) {
    statusMessage.className = 'status info';
    statusMessage.querySelector('.status-text').textContent = message;
    statusMessage.querySelector('.bi').className = 'bi bi-info-circle';
    statusMessage.classList.remove('hidden');
  }

  function hideMessages() {
    statusMessage.classList.add('hidden');
  }

  // Handle message close button
  statusMessage.querySelector('.status-close').addEventListener('click', function() {
    hideMessages();
  });

  // Handle Enter key press
  form.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleLanguageChange();
    }
  });
}

function initializeSidebar() {
  const navToggle = document.querySelector('.nav-toggle');
  const navItems = document.querySelector('.nav-items');
  const navChevron = document.querySelector('.nav-chevron');

  if (navToggle) {
    navToggle.addEventListener('click', function() {
      navItems.classList.toggle('collapsed');
      navToggle.classList.toggle('collapsed');
    });
  }

  // Handle nav item clicks
  const navItemButtons = document.querySelectorAll('.nav-item');
  navItemButtons.forEach(button => {
    button.addEventListener('click', function() {
      // Remove active class from all items
      navItemButtons.forEach(item => item.classList.remove('active'));
      // Add active class to clicked item
      this.classList.add('active');

      // Show/hide form sections
      const section = this.getAttribute('data-section');
      const formSections = document.querySelectorAll('.form-section');
      formSections.forEach(formSection => {
        if (formSection.getAttribute('data-section') === section) {
          formSection.classList.remove('hidden');
        } else {
          formSection.classList.add('hidden');
        }
      });
    });
  });
}
