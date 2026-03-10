/* GL Branch Details - Stop Payment/Void Book Module JavaScript */

(function() {
  'use strict';

  // Initialize Stop Payment module when DOM is ready
  document.addEventListener('DOMContentLoaded', function() {
    initializeStopPayment();
  });

  /**
   * Initialize all Stop Payment module functionality
   */
  function initializeStopPayment() {
    initializeButtons();
    initializeFormControls();
    initializeCollapsibleSections();
  }

  /**
   * Make titled sections collapsible.
   */
  function initializeCollapsibleSections() {
    const titles = document.querySelectorAll('[data-collapsible-title]');

    titles.forEach(function(title) {
      const section = title.parentElement;
      if (!section) return;

      const contentNodes = Array.from(section.children).filter(function(node) {
        return node !== title;
      });
      if (!contentNodes.length) return;

      const indicator = document.createElement('span');
      indicator.textContent = ' [-]';
      indicator.style.fontWeight = '700';
      title.appendChild(indicator);

      title.style.cursor = 'pointer';
      title.setAttribute('role', 'button');
      title.setAttribute('tabindex', '0');
      title.setAttribute('aria-expanded', 'true');

      const toggle = function() {
        const isExpanded = title.getAttribute('aria-expanded') === 'true';
        const nextExpanded = !isExpanded;
        title.setAttribute('aria-expanded', nextExpanded ? 'true' : 'false');
        indicator.textContent = nextExpanded ? ' [-]' : ' [+]';

        contentNodes.forEach(function(node) {
          node.style.display = nextExpanded ? '' : 'none';
        });
      };

      title.addEventListener('click', toggle);
      title.addEventListener('keydown', function(event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggle();
        }
      });
    });
  }

  /**
   * Initialize button click handlers
   */
  function initializeButtons() {
    const viewBtn = document.getElementById('gsp-view-btn');
    const addBtn = document.getElementById('gsp-add-btn');
    const editBtn = document.getElementById('gsp-edit-btn');
    const deleteBtn = document.getElementById('gsp-delete-btn');
    const saveBtn = document.getElementById('gsp-save-btn');
    const submitBtn = document.getElementById('gsp-submit-btn');
    const cancelBtn = document.getElementById('gsp-cancel-btn');

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

    if (submitBtn) {
      submitBtn.addEventListener('click', handleSubmit);
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', handleCancel);
    }
  }

  /**
   * Initialize form control interactions
   */
  function initializeFormControls() {
    const paymentTypeSelect = document.getElementById('gsp-payment-type');

    if (paymentTypeSelect) {
      paymentTypeSelect.addEventListener('change', function() {
        handlePaymentTypeChange(this.value);
      });
    }

    const reasonIdSelect = document.getElementById('gsp-reason-id');
    if (reasonIdSelect) {
      reasonIdSelect.addEventListener('change', function() {
        handleReasonIdChange(this.value);
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
    const branchId = document.getElementById('gsp-branch-id').value;

    if (!branchId) {
      showAlert('Please select a branch', 'warning');
      return;
    }

    showAlert('Displaying stop payment/void book records for current branch', 'info');
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

    // Set default values
    document.getElementById('gsp-payment-type').value = 'VOID';

    // Focus on first input field
    const firstInput = document.querySelector('.form-control:not([disabled]):not([readonly])');
    if (firstInput && firstInput.id !== 'gsp-branch-id') {
      firstInput.focus();
    }

    showAlert('Ready to add new stop payment/void book record', 'info');
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

    if (confirm('Are you sure you want to delete this stop payment/void book record?')) {
      showAlert('Record deleted successfully', 'success');
      // Add actual delete logic here
    }
  }

  /**
   * Handle Save button click
   */
  function handleSave() {
    const branchId = document.getElementById('gsp-branch-id').value;
    const accountId = document.getElementById('gsp-account-id').value;
    const paymentType = document.getElementById('gsp-payment-type').value;
    const chequeStart = document.getElementById('gsp-cheque-start').value;

    if (!branchId || !accountId || !paymentType) {
      showAlert('Please fill in all required fields', 'danger');
      return;
    }

    if (!chequeStart) {
      showAlert('Please enter cheque start number', 'warning');
      return;
    }

    showAlert('Stop payment/void book saved successfully', 'success');
    // Add actual save logic here
  }

  /**
   * Handle Submit button click
   */
  function handleSubmit() {
    const branchId = document.getElementById('gsp-branch-id').value;
    const accountId = document.getElementById('gsp-account-id').value;
    const paymentType = document.getElementById('gsp-payment-type').value;

    if (!branchId || !accountId || !paymentType) {
      showAlert('Please fill in all required fields before submitting', 'danger');
      return;
    }

    if (confirm('Are you sure you want to submit this stop payment/void book record?')) {
      showAlert('Stop payment/void book submitted successfully for approval', 'success');
      // Add actual submit logic here
    }
  }

  /**
   * Handle Cancel button click
   */
  function handleCancel() {
    // Clear form fields
    const formControls = document.querySelectorAll('.form-control, .form-select');
    formControls.forEach(function(control) {
      if (!control.disabled && !control.readOnly && control.id !== 'gsp-branch-id') {
        control.value = '';
      }
    });

    showAlert('Operation cancelled', 'info');
  }

  /**
   * Handle Payment Type selection change
   */
  function handlePaymentTypeChange(paymentType) {
    console.log('Payment Type changed to:', paymentType);
    // Implement specific logic based on payment type
  }

  /**
   * Handle Reason ID selection change
   */
  function handleReasonIdChange(reasonId) {
    const reasonInput = document.getElementById('gsp-reason');
    
    // Map reason IDs to reason descriptions
    const reasonMap = {
      '1': 'Insufficient Funds',
      '2': 'Account Closed',
      '3': 'Customer Request',
      '4': 'Duplicate Payment',
      '5': 'Other'
    };

    if (reasonMap[reasonId]) {
      reasonInput.value = reasonMap[reasonId];
    } else {
      reasonInput.value = '';
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
  window.StopPayment = {
    handleView: handleView,
    handleAdd: handleAdd,
    handleEdit: handleEdit,
    handleDelete: handleDelete,
    handleSave: handleSave,
    handleSubmit: handleSubmit,
    handleCancel: handleCancel,
    showAlert: showAlert
  };
})();
