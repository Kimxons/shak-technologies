document.addEventListener('DOMContentLoaded', function () {
  // Handle Back button
  const backBtn = document.getElementById('backBtn');
  if (backBtn) {
    backBtn.addEventListener('click', function () {
      window.close();
    });
  }

  // Handle Close button
  const closeBtn = document.getElementById('closeBtn');
  if (closeBtn) {
    closeBtn.addEventListener('click', function () {
      window.close();
    });
  }

  // Handle Go Back link
  const goBackLink = document.getElementById('goBackLink');
  if (goBackLink) {
    goBackLink.addEventListener('click', function (e) {
      e.preventDefault();
      window.close();
    });
  }

  // Inline Mode Enhancements
  if (window.location.search.includes('inline=true')) {
    // Hide the redundant sidebar
    const sidebar = document.querySelector('.rule-details-sidebar');
    if (sidebar) sidebar.style.display = 'none';

    // Adjust container to fit iframe better
    const container = document.querySelector('.rule-details-container');
    if (container) {
      container.style.height = '100%';
      container.style.width = '100%';
    }

    // Override back button behavior for inline
    if (backBtn) {
      backBtn.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (window.parent && window.parent.closeModalWindow) {
          window.parent.closeModalWindow();
        }
      };
    }

    // Override close button behavior for inline
    if (closeBtn) {
      closeBtn.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (window.parent && window.parent.closeModalWindow) {
          window.parent.closeModalWindow();
        }
      };
    }
  }
});
