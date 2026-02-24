// System Audit Trail Module - System Utilities

document.addEventListener('DOMContentLoaded', function() {
  initializeAuditTrail();
  initializeSidebar();
});

function initializeAuditTrail() {
  const form = document.getElementById('auditTrailForm');
  const viewBtn = document.querySelector('[data-action="view"]');
  const searchBtn = document.querySelector('[data-action="search"]');
  const cancelBtn = document.querySelector('[data-action="cancel"]');
  const statusMessage = document.getElementById('statusMessage');

  // Search button handler
  searchBtn.addEventListener('click', function(e) {
    e.preventDefault();
    handleSearch();
  });

  // View button handler
  viewBtn.addEventListener('click', function(e) {
    e.preventDefault();
    handleView();
  });

  // Cancel button handler
  cancelBtn.addEventListener('click', function(e) {
    e.preventDefault();
    handleCancel();
  });

  // Inline search buttons
  const inlineSearchButtons = document.querySelectorAll('[data-action^="search-"]');
  inlineSearchButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      const searchType = this.getAttribute('data-action');
      handleInlineSearch(searchType);
    });
  });

  function handleSearch() {
    const branchId = document.getElementById('branchId').value.trim();
    const moduleId = document.getElementById('moduleId').value.trim();
    const operatorId = document.getElementById('operatorId').value.trim();
    const fromDate = document.getElementById('fromDate').value;
    const toDate = document.getElementById('toDate').value;
    const event = document.getElementById('event').value;
    const searchCriteria = document.getElementById('searchCriteria').value.trim();

    // Validate date range
    if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) {
      showError('From Date cannot be greater than To Date');
      return;
    }

    // Show loading state
    searchBtn.disabled = true;
    const originalContent = searchBtn.innerHTML;
    searchBtn.innerHTML = '<i class="bi bi-hourglass-split" aria-hidden="true"></i><span>Searching...</span>';

    // Simulate API call
    setTimeout(function() {
      try {
        // Simulate search logic - in production, this would call an API
        const success = true;

        if (success) {
          // Populate tables with sample data
          populateAuditLogTable();
          populateAuditDetailsTable();
          showSuccess('Audit trail search completed successfully');
        } else {
          showError('No audit records found matching the criteria');
        }
      } catch (error) {
        showError('An error occurred while searching. Please try again.');
      } finally {
        searchBtn.disabled = false;
        searchBtn.innerHTML = originalContent;
      }
    }, 1000);
  }

  function handleView() {
    const auditLogTable = document.getElementById('auditLogTable');
    const selectedRow = auditLogTable.querySelector('tbody tr:not(.empty-row)');

    if (!selectedRow) {
      showWarning('Please search and select an audit log record first');
      return;
    }

    showInfo('Viewing selected audit log record details');
  }

  function handleCancel() {
    // Clear form
    form.reset();
    
    // Clear tables
    const auditLogBody = document.getElementById('auditLogTable').querySelector('tbody');
    const auditDetailsBody = document.getElementById('auditDetailsTable').querySelector('tbody');
    
    auditLogBody.innerHTML = '<tr class="empty-row"><td colspan="5">No records to display.</td></tr>';
    auditDetailsBody.innerHTML = '<tr class="empty-row"><td colspan="5">No records to display.</td></tr>';
    
    hideMessages();
    showInfo('Form cleared');
  }

  function handleInlineSearch(searchType) {
    // In a real application, this would open a search dialog
    // For now, we'll just show a message
    showInfo(`Opening search dialog for ${searchType.replace('search-', '')}`);
  }

  function populateAuditLogTable() {
    const tableBody = document.getElementById('auditLogTable').querySelector('tbody');
    tableBody.innerHTML = `
      <tr>
        <td>LOG001</td>
        <td>ADMIN</td>
        <td>VIEW</td>
        <td>2025-01-14 10:30:45</td>
        <td>192.168.1.100</td>
      </tr>
      <tr>
        <td>LOG002</td>
        <td>USER001</td>
        <td>CREATE</td>
        <td>2025-01-14 11:15:30</td>
        <td>192.168.1.101</td>
      </tr>
      <tr>
        <td>LOG003</td>
        <td>ADMIN</td>
        <td>UPDATE</td>
        <td>2025-01-14 12:00:00</td>
        <td>192.168.1.100</td>
      </tr>
    `;
  }

  function populateAuditDetailsTable() {
    const tableBody = document.getElementById('auditDetailsTable').querySelector('tbody');
    tableBody.innerHTML = `
      <tr>
        <td>Clients</td>
        <td>ClientName</td>
        <td>John Doe</td>
        <td>John Smith</td>
        <td>No</td>
      </tr>
      <tr>
        <td>Clients</td>
        <td>ClientStatus</td>
        <td>Active</td>
        <td>Inactive</td>
        <td>No</td>
      </tr>
      <tr>
        <td>Clients</td>
        <td>UpdateDate</td>
        <td>2025-01-10</td>
        <td>2025-01-14</td>
        <td>No</td>
      </tr>
    `;
  }

  function showError(message) {
    statusMessage.className = 'status error';
    statusMessage.querySelector('.status-text').textContent = message;
    statusMessage.querySelector('.bi').className = 'bi bi-exclamation-circle-fill';
    statusMessage.classList.remove('hidden');
  }

  function showSuccess(message) {
    statusMessage.className = 'status success';
    statusMessage.querySelector('.status-text').textContent = message;
    statusMessage.querySelector('.bi').className = 'bi bi-check-circle-fill';
    statusMessage.classList.remove('hidden');
  }

  function showWarning(message) {
    statusMessage.className = 'status warning';
    statusMessage.querySelector('.status-text').textContent = message;
    statusMessage.querySelector('.bi').className = 'bi bi-exclamation-triangle-fill';
    statusMessage.classList.remove('hidden');
  }

  function showInfo(message) {
    statusMessage.className = 'status info';
    statusMessage.querySelector('.status-text').textContent = message;
    statusMessage.querySelector('.bi').className = 'bi bi-info-circle';
    statusMessage.classList.remove('hidden');
  }

  function hideMessages() {
    statusMessage.classList.add('hidden');
  }

  // Handle message close button
  statusMessage.querySelector('.status-close').addEventListener('click', function() {
    hideMessages();
  });

  // Handle Enter key press in form
  form.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  });
}

function initializeSidebar() {
  const navToggle = document.querySelector('.nav-toggle');
  const navItems = document.querySelector('.nav-items');
  const navChevron = document.querySelector('.nav-chevron');

  if (navToggle) {
    navToggle.addEventListener('click', function() {
      navItems.classList.toggle('collapsed');
      navToggle.classList.toggle('collapsed');
    });
  }

  // Handle nav item clicks
  const navItemButtons = document.querySelectorAll('.nav-item');
  navItemButtons.forEach(button => {
    button.addEventListener('click', function() {
      // Remove active class from all items
      navItemButtons.forEach(item => item.classList.remove('active'));
      // Add active class to clicked item
      this.classList.add('active');

      // Show/hide form sections
      const section = this.getAttribute('data-section');
      const formSections = document.querySelectorAll('.form-section');
      formSections.forEach(formSection => {
        if (formSection.getAttribute('data-section') === section) {
          formSection.classList.remove('hidden');
        } else {
          formSection.classList.add('hidden');
        }
      });
    });
  });
}
