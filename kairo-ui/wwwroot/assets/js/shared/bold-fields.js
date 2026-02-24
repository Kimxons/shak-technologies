// This script will make all input, select, and textarea field values bold on page load and when values are set programmatically.
(function() {
  function setBoldOnFields() {
    // For all input fields (except buttons)
    document.querySelectorAll('input.form-control:not([type=button]):not([type=submit]):not([type=reset])').forEach(function(input) {
      input.style.fontWeight = 'bold';
    });
    // For all select fields
    document.querySelectorAll('select.form-select').forEach(function(select) {
      select.style.fontWeight = 'bold';
    });
    // For all textarea fields
    document.querySelectorAll('textarea.form-control').forEach(function(textarea) {
      textarea.style.fontWeight = 'bold';
    });
  }
  // Run on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', setBoldOnFields);
  // Also run after any AJAX or dynamic update (if needed, can be called manually)
  window.setBoldOnFields = setBoldOnFields;
})();
