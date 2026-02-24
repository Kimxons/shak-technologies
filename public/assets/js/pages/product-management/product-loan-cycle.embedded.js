// Product Loan Cycle Form JavaScript
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
  const afterBtn = document.getElementById('afterBtn');
  const removeBtn = document.getElementById('removeBtn');
  const updateBtn = document.getElementById('updateBtn');
  const clearBtn = document.getElementById('clearBtn');
  const viewBtn = document.getElementById('viewBtn');
  const addBtn = document.getElementById('addBtn');
  const editBtn = document.getElementById('editBtn');
  const deleteBtn = document.getElementById('deleteBtn');
  const saveBtn = document.getElementById('saveBtn');
  const cancelBtn = document.getElementById('cancelBtn');

  if (newBtn) {
    newBtn.addEventListener('click', function() {
      // Clear all form fields
      document.getElementById('effectiveDate').value = '';
      document.getElementById('loanCycleNo').value = '';
      document.getElementById('loanLevelNo').value = '';
      document.getElementById('minLoanAmount').value = '';
      document.getElementById('maxLoanAmount').value = '';
      document.getElementById('minLoanTerm').value = '';
      document.getElementById('maxLoanTerm').value = '';
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', function() {
      // Clear all form fields
      document.getElementById('effectiveDate').value = '';
      document.getElementById('loanCycleNo').value = '';
      document.getElementById('loanLevelNo').value = '';
      document.getElementById('minLoanAmount').value = '';
      document.getElementById('maxLoanAmount').value = '';
      document.getElementById('minLoanTerm').value = '';
      document.getElementById('maxLoanTerm').value = '';
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
