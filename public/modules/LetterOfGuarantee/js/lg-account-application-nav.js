// Collapsible left nav for LG Account Application
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var navToggles = Array.from(document.querySelectorAll('.cm-nav-toggle'));
    navToggles.forEach(function (toggle) {
      toggle.addEventListener('click', function () {
        var section = toggle.closest('.cm-nav-section');
        var items = section && section.querySelector('.cm-nav-items');
        if (items) {
          items.classList.toggle('is-collapsed');
        }
        var icon = toggle.querySelector('.bi');
        if (icon) {
          icon.classList.toggle('bi-chevron-down');
          icon.classList.toggle('bi-chevron-right');
        }
      });
    });
  });
})();
