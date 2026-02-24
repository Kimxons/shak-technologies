document.addEventListener('DOMContentLoaded', function () {
  const dataEntryContainer = document.getElementById('data-entry-container');
  const dataEntryIframe = document.getElementById('data-entry-iframe');

  // Open data entry module
  function openDataEntry(url) {
    if (dataEntryContainer && dataEntryIframe) {
      dataEntryContainer.style.display = 'block';
      const separator = url.includes('?') ? '&' : '?';
      dataEntryIframe.src = url + separator + 'inline=true';
    }
  }

  // Close data entry module
  window.closeModalWindow = function () {
    if (dataEntryContainer && dataEntryIframe) {
      dataEntryContainer.style.display = 'none';
      dataEntryIframe.src = '';
    }
  };

  // Handle sidebar item clicks
  const sidebarItems = document.querySelectorAll('.pm-sidebar-item');
  sidebarItems.forEach(item => {
    item.addEventListener('click', function () {
      const module = this.getAttribute('data-module');
      if (module) {
        openDataEntry(module);
      }
    });
  });
});
