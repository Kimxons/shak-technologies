/* GL Branch Details - Cheque Book Module JavaScript */

(function() {
  'use strict';

  // Initialize Cheque Book module when DOM is ready
  document.addEventListener('DOMContentLoaded', function() {
    initializeChequeBook();
  });

  /**
   * Initialize all Cheque Book module functionality
   */
  function initializeChequeBook() {
    initializeTabSwitching();
    initializeButtons();
    initializeFormControls();
  }

  /**
   * Initialize tab switching functionality
   */
  function initializeTabSwitching() {
    const tabButtons = document.querySelectorAll('.gcb-tab-btn');

    tabButtons.forEach(function(button) {
      button.addEventListener('click', function() {
        const tabName = this.getAttribute('data-tab');
        switchTab(tabName);
      });
    });
  }

  /**
   * Switch to specified tab
   */
  function switchTab(tabName) {
    const tabButtons = document.querySelectorAll('.gcb-tab-btn');
    const tabContents = document.querySelectorAll('.gcb-tab-content');

    // Remove active class from all buttons and contents
    tabButtons.forEach(function(btn) {
      btn.classList.remove('gcb-tab-active');
    });

    tabContents.forEach(function(content) {
      content.classList.remove('active');
    });

    // Add active class to clicked button and corresponding content
    const activeButton = document.querySelector('[data-tab="' + tabName + '"]');
    const activeContent = document.getElementById('gcb-' + tabName + '-content');

    if (activeButton) {
      activeButton.classList.add('gcb-tab-active');
    }

    if (activeContent) {
      activeContent.classList.add('active');
    }
  }

  /**
   * Initialize button click handlers
   */
  function initializeButtons() {
    const approveBtn = document.getElementById('gcb-approve-btn');
    const dispatchBtn = document.getElementById('gcb-dispatch-btn');
    const viewBtn = document.getElementById('gcb-view-btn');
    const addBtn = document.getElementById('gcb-add-btn');
    const editBtn = document.getElementById('gcb-edit-btn');
    const deleteBtn = document.getElementById('gcb-delete-btn');
    const saveBtn = document.getElementById('gcb-save-btn');

    if (approveBtn) {
      approveBtn.addEventListener('click', handleApprove);
    }

    if (dispatchBtn) {
      dispatchBtn.addEventListener('click', handleDispatch);
    }

    if (viewBtn) {
      viewBtn.addEventListener('click', handleView);
    }

    if (addBtn) {
      addBtn.addEventListener('click', handleAdd);
    }

    if (editBtn) {
      editBtn.addEventListener('click', handleEdit);
    }

    if (deleteBtn) {
      deleteBtn.addEventListener('click', handleDelete);
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', handleSave);
    }
  }

  /**
   * Initialize form control interactions
   */
  function initializeFormControls() {
    const bookTypeSelect = document.getElementById('gcb-book-type');

    if (bookTypeSelect) {
      bookTypeSelect.addEventListener('change', function() {
        handleBookTypeChange(this.value);
      });
    }

    // Form control focus/blur effects
    const formControls = document.querySelectorAll('.form-control, .form-select');
    formControls.forEach(function(control) {
      control.addEventListener('focus', function() {
        this.closest('.mb-3') ? this.closest('.mb-3').style.marginBottom = '1rem' : null;
      });

      control.addEventListener('blur', function() {
        // Optional: perform validation on blur
      });
    });
  }

  /**
   * Handle Approve button click
   */
  function handleApprove() {
    const branchId = document.getElementById('gcb-branch-id').value;
    const bookType = document.getElementById('gcb-book-type').value;

    if (!branchId || !bookType) {
      showAlert('Please fill in required fields', 'warning');
      return;
    }

    showAlert('Cheque book approved successfully', 'success');
    // Add actual approval logic here
  }

  /**
   * Handle Dispatch button click
   */
  function handleDispatch() {
    const branchId = document.getElementById('gcb-branch-id').value;

    if (!branchId) {
      showAlert('Please select a branch', 'warning');
      return;
    }

    showAlert('Cheque book dispatched successfully', 'success');
    // Add actual dispatch logic here
  }

  /**
   * Handle View button click
   */
  function handleView() {
    const activeTab = document.querySelector('.gcb-tab-active');
    const tabName = activeTab ? activeTab.getAttribute('data-tab') : 'issued-cpos';

    if (tabName === 'issued-cpos') {
      showAlert('Displaying Issued CPOs for current cheque book', 'info');
    } else {
      showAlert('Displaying Requested CPOs for current cheque book', 'info');
    }
  }

  /**
   * Handle Add button click
   */
  function handleAdd() {
    // Clear form fields for new entry
    const formControls = document.querySelectorAll('.form-control, .form-select');
    formControls.forEach(function(control) {
      if (!control.disabled && !control.readOnly) {
        control.value = '';
      }
    });

    // Focus on first input field
    const firstInput = document.querySelector('.form-control:not([disabled]):not([readonly])');
    if (firstInput) {
      firstInput.focus();
    }

    showAlert('Ready to add new cheque book record', 'info');
  }

  /**
   * Handle Edit button click
   */
  function handleEdit() {
    const selectedRow = document.querySelector('table tbody tr');

    if (!selectedRow) {
      showAlert('Please select a record to edit', 'warning');
      return;
    }

    // Enable form controls for editing
    const formControls = document.querySelectorAll('.form-control, .form-select');
    formControls.forEach(function(control) {
      control.disabled = false;
    });

    showAlert('Record is now in edit mode', 'info');
  }

  /**
   * Handle Delete button click
   */
  function handleDelete() {
    const selectedRow = document.querySelector('table tbody tr');

    if (!selectedRow) {
      showAlert('Please select a record to delete', 'warning');
      return;
    }

    if (confirm('Are you sure you want to delete this cheque book record?')) {
      showAlert('Record deleted successfully', 'success');
      // Add actual delete logic here
    }
  }

  /**
   * Handle Save button click
   */
  function handleSave() {
    const branchId = document.getElementById('gcb-branch-id').value;
    const accountId = document.getElementById('gcb-account-id').value;
    const bookType = document.getElementById('gcb-book-type').value;

    if (!branchId || !accountId || !bookType) {
      showAlert('Please fill in all required fields', 'danger');
      return;
    }

    // Validate CPO fields if Book Type requires it
    const cpoStart = document.getElementById('gcb-cpo-start').value;
    const cpoEnd = document.getElementById('gcb-cpo-end').value;

    if (cpoStart && !cpoEnd) {
      showAlert('Please complete CPO range', 'warning');
      return;
    }

    showAlert('Cheque book saved successfully', 'success');
    // Add actual save logic here
  }

  /**
   * Handle Book Type selection change
   */
  function handleBookTypeChange(bookType) {
    const noOfLeavesInput = document.getElementById('gcb-no-of-leaves');

    // Update No Of Leaves based on Book Type
    const leafMap = {
      '25-leafs': '25',
      '50-leafs': '50',
      '100-leafs': '100'
    };

    if (leafMap[bookType]) {
      noOfLeavesInput.value = leafMap[bookType];
    }
  }

  /**
   * Display alert message
   */
  function showAlert(message, type = 'info') {
    // Create alert element
    const alertDiv = document.createElement('div');
    const alertClass = {
      'success': '#d1fae5',
      'danger': '#fee2e2',
      'warning': '#fef3c7',
      'info': '#dbeafe'
    }[type] || '#dbeafe';

    const alertTextColor = {
      'success': '#065f46',
      'danger': '#7f1d1d',
      'warning': '#92400e',
      'info': '#0c2340'
    }[type] || '#0c2340';

    alertDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 16px;
      background-color: ${alertClass};
      color: ${alertTextColor};
      border-radius: 0.375rem;
      border: 1px solid ${alertTextColor};
      opacity: 0.8;
      z-index: 9999;
      font-size: 0.875rem;
      max-width: 300px;
      word-wrap: break-word;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    `;

    alertDiv.textContent = message;
    document.body.appendChild(alertDiv);

    // Auto remove after 3 seconds
    setTimeout(function() {
      alertDiv.remove();
    }, 3000);
  }

  /**
   * Export for testing (if needed)
   */
  window.ChequeBook = {
    switchTab: switchTab,
    handleApprove: handleApprove,
    handleDispatch: handleDispatch,
    handleView: handleView,
    handleAdd: handleAdd,
    handleEdit: handleEdit,
    handleDelete: handleDelete,
    handleSave: handleSave,
    showAlert: showAlert
  };
})();
