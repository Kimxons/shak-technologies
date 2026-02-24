// Modal functions
    function openGroupLoanMenuModal() {
      document.getElementById('groupLoanMenuModal').classList.add('show');
    }

    function closeGroupLoanMenuModal() {
      document.getElementById('groupLoanMenuModal').classList.remove('show');
    }

    // Close modal on overlay click
    document.getElementById('groupLoanMenuModal').addEventListener('click', function(e) {
      if (e.target === this) {
        closeGroupLoanMenuModal();
      }
    });

    // Close modal on ESC key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        closeGroupLoanMenuModal();
      }
    });
