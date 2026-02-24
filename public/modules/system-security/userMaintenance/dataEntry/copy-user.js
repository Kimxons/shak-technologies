(function () {
  // Load required services
  async function loadServices() {
    if (typeof window.ServiceLoader !== 'undefined') {
      await window.ServiceLoader.loadCore();
      await window.ServiceLoader.loadUserService();
    }
  }

  function postClose() {
    try {
      window.parent.postMessage({ type: 'kairo-dataentry-close' }, '*');
    } catch (_) {
      // ignore
    }
  }

  function setMinimized(isMinimized) {
    var root = document.querySelector('[data-cu-window]');
    if (!root) return;
    root.classList.toggle('cu-window--minimized', Boolean(isMinimized));
  }

  function doRefresh() {
    try {
      window.location.reload();
    } catch (_) {
      // ignore
    }
  }

  function wireTitleBar() {
    var btnClose = document.querySelector('[data-cu-close]');
    var btnMin = document.querySelector('[data-cu-minimize]');
    var btnRefresh = document.querySelector('[data-cu-refresh]');

    if (btnClose) btnClose.addEventListener('click', postClose);

    if (btnMin) {
      btnMin.addEventListener('click', function () {
        var root = document.querySelector('[data-cu-window]');
        var minimized = root && root.classList.contains('cu-window--minimized');
        setMinimized(!minimized);
      });
    }

    if (btnRefresh) btnRefresh.addEventListener('click', doRefresh);
  }

  function wireActionButtons() {
    var btnBack = document.querySelector('[data-cu-back]');
    var btnSave = document.querySelector('[data-cu-save]');
    var btnCancel = document.querySelector('[data-cu-cancel]');
    
    if (btnBack) btnBack.addEventListener('click', postClose);

    // Wire lookup buttons
    var lookupBtns = document.querySelectorAll('[data-cu-lookup]');
    lookupBtns.forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        var lookupType = e.currentTarget.dataset.cuLookup;
        showSearchModal(lookupType);
      });
    });

    // Wire save button
    if (btnSave) {
      btnSave.addEventListener('click', function (e) {
        e.preventDefault();
        handleSave();
      });
    }

    // Wire cancel button
    if (btnCancel) {
      btnCancel.addEventListener('click', function (e) {
        e.preventDefault();
        clearAllFields();
      });
    }
  }

  // Track if login ID is validated and user doesn't exist
  var isLoginIdValidated = false;

  function checkFormState() {
    var saveBtn = document.querySelector('[data-cu-save]');
    var cancelBtn = document.querySelector('[data-cu-cancel]');
    
    // Only enable buttons if login ID is validated (no existing user)
    if (saveBtn) saveBtn.disabled = !isLoginIdValidated;
    if (cancelBtn) cancelBtn.disabled = !isLoginIdValidated;
  }

  function clearAllFields() {
    // Clear all input fields
    var inputs = document.querySelectorAll('input');
    inputs.forEach(function(input) {
      if (input.type !== 'button' && input.type !== 'submit') {
        input.value = '';
      }
    });
    
    // Reset all select fields to first option
    var selects = document.querySelectorAll('select');
    selects.forEach(function(select) {
      select.selectedIndex = 0;
    });
    
    // Reset validation state and disable save and cancel buttons
    isLoginIdValidated = false;
    checkFormState();
  }

  function showMessage(message, isError) {
    var messageEl = document.querySelector('.cu-message');
    if (messageEl) {
      messageEl.textContent = message;
      messageEl.style.color = isError ? '#c60000' : '#27ae60';
    }
  }

  function showToast(message, type) {
    // Remove existing toast if any
    var existingToast = document.querySelector('.cu-toast');
    if (existingToast) {
      existingToast.remove();
    }

    // Create toast element
    var toast = document.createElement('div');
    toast.className = 'cu-toast cu-toast--' + (type || 'info');
    toast.textContent = message;
    document.body.appendChild(toast);

    // Show toast with animation
    setTimeout(function() {
      toast.classList.add('cu-toast--show');
    }, 10);

    // Auto hide after 3 seconds
    setTimeout(function() {
      toast.classList.remove('cu-toast--show');
      setTimeout(function() {
        if (toast.parentNode) {
          toast.remove();
        }
      }, 300);
    }, 3000);
  }

  function checkLoginIdExists(loginId) {
    if (!loginId || loginId.trim().length < 3) {
      isLoginIdValidated = false;
      checkFormState();
      return;
    }

    if (typeof window.UserService !== 'undefined') {
      var branchId = window.Environment?.branchId || '0101';
      var operatorId = window.Environment?.operatorId || 'CSADM';
      
      // Show loading indicator
      showToast('Checking user...', 'info');
      
      window.UserService.getUsers({
        LoginOperatorID: operatorId,
        OurBranchID: branchId,
        RequireOperatorID: loginId,
        Direction: 0
      })
      .then(function(response) {
        if (response.success && response.data && response.data.Details01 && response.data.Details01.length > 0) {
          // User exists - check if Details01 has actual user data
          var userData = response.data.Details01[0];
          if (userData.Name && userData.Name.trim() !== '') {
            showToast('User with Login ID "' + loginId + '" already exists', 'error');
            isLoginIdValidated = false;
            var loginIdInput = document.getElementById('loginId');
            if (loginIdInput) {
              loginIdInput.value = '';
            }
            checkFormState();
          } else {
            // No user found - enable buttons
            showToast('Login ID available', 'success');
            isLoginIdValidated = true;
            checkFormState();
          }
        } else {
          // No user found - enable buttons
          showToast('Login ID available', 'success');
          isLoginIdValidated = true;
          checkFormState();
        }
      })
      .catch(function(error) {
        showToast('Error checking user: ' + (error.message || 'Unknown error'), 'error');
        isLoginIdValidated = false;
        checkFormState();
      });
    }
  }

  function validateForm() {
    var loginId = document.getElementById('loginId').value.trim();
    var password = document.getElementById('password').value;
    var confirmPassword = document.getElementById('confirmPassword').value;

    if (!loginId) {
      showMessage('Login ID is required', true);
      return false;
    }

    if (!password) {
      showMessage('Password is required', true);
      return false;
    }

    if (password !== confirmPassword) {
      showMessage('Password and Confirm Password do not match', true);
      return false;
    }

    return true;
  }

  function handleSave() {
    // Validate form
    if (!validateForm()) {
      return;
    }

    var loginId = document.getElementById('loginId').value.trim();
    var saveBtn = document.querySelector('[data-cu-save]');

    // Check if user already exists
    if (typeof window.UserService !== 'undefined') {
      // Disable save button during check
      if (saveBtn) saveBtn.disabled = true;
      
      showToast('Validating user...', 'info');
      
      var branchId = window.Environment?.branchId || '0101';
      var operatorId = window.Environment?.operatorId || 'CSADM';
      
      window.UserService.getUsers({
        LoginOperatorID: operatorId,
        OurBranchID: branchId,
        RequireOperatorID: loginId,
        Direction: 0
      })
      .then(function(response) {
        if (response.success && response.data && response.data.Details01 && response.data.Details01.length > 0) {
          // User exists - check if Details01 has actual user data
          var userData = response.data.Details01[0];
          if (userData.Name && userData.Name.trim() !== '') {
            showToast('User with Login ID "' + loginId + '" already exists', 'error');
            clearAllFields();
            return;
          }
        }
        
        // User doesn't exist, proceed with save
        showToast('Validation passed. Saving user...', 'success');
        // TODO: Implement actual save logic here
        
        // Re-enable save button after save completes
        setTimeout(function() {
          if (saveBtn) saveBtn.disabled = false;
        }, 1000);
      })
      .catch(function(error) {
        showToast('Error validating user: ' + (error.message || 'Unknown error'), 'error');
        // Re-enable save button on error
        if (saveBtn) saveBtn.disabled = false;
      });
    } else {
      showToast('UserService not available', 'error');
    }
  }

  function wireFormInputs() {
    // Add blur validation for login ID
    var loginIdInput = document.getElementById('loginId');
    if (loginIdInput) {
      // Force uppercase for login ID
      loginIdInput.addEventListener('input', function(e) {
        var start = e.target.selectionStart;
        var end = e.target.selectionEnd;
        e.target.value = e.target.value.toUpperCase();
        e.target.setSelectionRange(start, end);
        
        // Reset validation state when user modifies login ID
        isLoginIdValidated = false;
        checkFormState();
      });
      
      loginIdInput.addEventListener('blur', function() {
        var loginId = loginIdInput.value.trim();
        if (loginId) {
          checkLoginIdExists(loginId);
        } else {
          isLoginIdValidated = false;
          checkFormState();
        }
      });
    }
  }

  function showSearchModal(lookupType) {
    var overlay = document.getElementById('cuSearchOverlay');
    var frame = document.getElementById('cuSearchFrame');
    
    if (overlay && frame) {
      if (lookupType === 'user') {
        frame.src = '../../common/user-search.html';
      }
      overlay.style.display = 'flex';
    }
  }

  function hideSearchModal() {
    var overlay = document.getElementById('cuSearchOverlay');
    var frame = document.getElementById('cuSearchFrame');
    
    if (overlay) {
      overlay.style.display = 'none';
    }
    if (frame) {
      frame.src = 'about:blank';
    }
  }

  function wireSearchModal() {
    var closeBtn = document.getElementById('cuSearchClose');
    var overlay = document.getElementById('cuSearchOverlay');
    
    if (closeBtn) {
      closeBtn.addEventListener('click', hideSearchModal);
    }
    
    if (overlay) {
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
          hideSearchModal();
        }
      });
    }
  }

  function init() {
    wireTitleBar();
    wireActionButtons();
    wireSearchModal();
    wireFormInputs();
    setupMessageListeners();
  }

  function setupMessageListeners() {
    window.addEventListener('message', function(event) {
      if (event.data?.type === 'USER_SELECTED') {
        var loginId = event.data.loginId;
        var loginIdInput = document.getElementById('loginId');
        if (loginIdInput && loginId) {
          loginIdInput.value = loginId;
        }
        hideSearchModal();
      }
      if (event.data?.type === 'kairo-dataentry-close') {
        hideSearchModal();
      }
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async function() {
      await loadServices();
      init();
    });
  } else {
    loadServices().then(init);
  }
})();