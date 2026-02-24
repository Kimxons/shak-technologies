/* GL Branch Details - Cancel Stop Book Module JavaScript */

(function() {
  'use strict';

  // Initialize Cancel Stop module when DOM is ready
  document.addEventListener('DOMContentLoaded', function() {
    initializeCancelStop();
  });

  /**
   * Initialize all Cancel Stop module functionality
   */
  function initializeCancelStop() {
    initializeButtons();
    initializeFormControls();
  }

  /**
   * Initialize button click handlers
   */
  function initializeButtons() {
    const viewBtn = document.getElementById('gcs-view-btn');
    const addBtn = document.getElementById('gcs-add-btn');
    const editBtn = document.getElementById('gcs-edit-btn');
    const deleteBtn = document.getElementById('gcs-delete-btn');

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
  }

  /**
   * Initialize form control interactions
   */
  function initializeFormControls() {
    const reasonIdSelect = document.getElementById('gcs-reason-id');

    if (reasonIdSelect) {
      reasonIdSelect.addEventListener('change', function() {
        handleReasonIdChange(this.value);
      });
    }

    const chequeDateSelect = document.getElementById('gcs-cheque-date');
    if (chequeDateSelect) {
      chequeDateSelect.addEventListener('change', function() {
        handleChequeDateChange(this.value);
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
   * Handle View button click
   */
  function handleView() {
    const branchId = document.getElementById('gcs-branch-id').value;

    if (!branchId) {
      showAlert('Please select a branch', 'warning');
      return;
    }

    showAlert('Displaying cancel stop book records for current branch', 'info');
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
    if (firstInput && firstInput.id !== 'gcs-branch-id') {
      firstInput.focus();
    }

    showAlert('Ready to add new cancel stop book record', 'info');
  }

  /**
   * Handle Edit button click
   */
  function handleEdit() {
    const selectedRow = document.querySelector('table tbody tr');

    if (!selectedRow || selectedRow.textContent.includes('No records')) {
      showAlert('Please select a record to edit', 'warning');
      return;
    }

    // Enable form controls for editing
    const formControls = document.querySelectorAll('.form-control, .form-select');
    formControls.forEach(function(control) {
      if (!control.id.includes('branch') && !control.id.includes('head-office')) {
        control.disabled = false;
      }
    });

    showAlert('Record is now in edit mode', 'info');
  }

  /**
   * Handle Delete button click
   */
  function handleDelete() {
    const selectedRow = document.querySelector('table tbody tr');

    if (!selectedRow || selectedRow.textContent.includes('No records')) {
      showAlert('Please select a record to delete', 'warning');
      return;
    }

    if (confirm('Are you sure you want to delete this cancel stop book record?')) {
      showAlert('Record deleted successfully', 'success');
      // Add actual delete logic here
    }
  }

  /**
   * Handle Reason ID selection change
   */
  function handleReasonIdChange(reasonId) {
    const reasonInput = document.getElementById('gcs-reason');
    
    // Map reason IDs to reason descriptions
    const reasonMap = {
      '1': 'Cheque Cancelled',
      '2': 'Duplicate Cancellation',
      '3': 'Lost Cheque',
      '4': 'Stale Cheque',
      '5': 'Customer Request'
    };

    if (reasonMap[reasonId]) {
      reasonInput.value = reasonMap[reasonId];
    } else {
      reasonInput.value = '';
    }
  }

  /**
   * Handle Cheque Date selection change
   */
  function handleChequeDateChange(chequeDate) {
    console.log('Cheque Date changed to:', chequeDate);
    // Implement specific logic based on cheque date selection
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
  window.CancelStop = {
    handleView: handleView,
    handleAdd: handleAdd,
    handleEdit: handleEdit,
    handleDelete: handleDelete,
    showAlert: showAlert
  };
})();
