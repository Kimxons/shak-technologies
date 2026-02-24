document.addEventListener('DOMContentLoaded', function() {
      // Handle Back button
      const backBtn = document.getElementById('backBtn');
      if (backBtn) {
        backBtn.addEventListener('click', function() {
          window.close();
        });
      }

      // Handle Go Back link
      const goBackLink = document.getElementById('goBackLink');
      if (goBackLink) {
        goBackLink.addEventListener('click', function(e) {
          e.preventDefault();
          window.close();
        });
      }
    });
