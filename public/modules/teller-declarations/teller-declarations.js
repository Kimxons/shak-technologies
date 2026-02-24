// Teller Declarations Module - Event Handlers and Functionality

document.addEventListener('DOMContentLoaded', function() {
  // Initialize module
  initializeTellerDeclarations();
  attachEventListeners();
});

function initializeTellerDeclarations() {
  // Load operator ID (from session/user context)
  const operatorIdField = document.getElementById('operatorIdField');
  operatorIdField.value = 'CSADM'; // Default value - should be dynamically loaded

  // Set status message
  displayStatusMessage('Logged In User not a Teller, Operation Disallowed [No:300041]');
}

function attachEventListeners() {
  // Search Button
  const currencyIdSearchBtn = document.getElementById('currencyIdSearchBtn');
  if (currencyIdSearchBtn) {
    currencyIdSearchBtn.addEventListener('click', function(e) {
      e.preventDefault();
      handleCurrencyIdSearch();
    });
  }

  // Action Buttons
  const viewBtn = document.getElementById('viewBtn');
  if (viewBtn) {
    viewBtn.addEventListener('click', function(e) {
      e.preventDefault();
      handleViewAction();
    });
  }

  const editBtn = document.getElementById('editBtn');
  if (editBtn) {
    editBtn.addEventListener('click', function(e) {
      e.preventDefault();
      handleEditAction();
    });
  }

  const deleteBtn = document.getElementById('deleteBtn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', function(e) {
      e.preventDefault();
      handleDeleteAction();
    });
  }

  const saveBtn = document.getElementById('saveBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', function(e) {
      e.preventDefault();
      handleSaveAction();
    });
  }

  const cancelBtn = document.getElementById('cancelBtn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', function(e) {
      e.preventDefault();
      handleCancelAction();
    });
  }
}

function handleCurrencyIdSearch() {
  const currencyIdField = document.getElementById('currencyIdField');
  const currencyId = currencyIdField.value.trim();

  if (!currencyId) {
    displayStatusMessage('Please enter a Currency ID to search.');
    return;
  }

  // TODO: Implement API call to search for currency
  console.log('Searching for Currency ID:', currencyId);
  
  // Simulated search - in production this would call an API
  displayStatusMessage('Searching for Currency ID...');
  
  // After search, populate table with results
  // loadDeclarationsData(currencyId);
}

function loadDeclarationsData(currencyId) {
  const tableBody = document.getElementById('declarationsTableBody');
  
  // TODO: Fetch data from API
  // Example structure:
  // const data = [
  //   { description: "Denomination 1", valueId: "1", count: 10, amount: 1000.00 },
  //   { description: "Denomination 2", valueId: "2", count: 5, amount: 500.00 }
  // ];
  
  // For now, show no records
  const noRecordsRow = tableBody.querySelector('tr');
  if (noRecordsRow && noRecordsRow.cells.length === 1 && 
      noRecordsRow.cells[0].getAttribute('colspan') === '4') {
    // Still showing no records message
    return;
  }

  // Clear existing rows
  tableBody.innerHTML = '';

  // If data is empty, show no records message
  if (!data || data.length === 0) {
    tableBody.innerHTML = '<tr style="text-align: center; color: #64748b; font-size: 0.8rem;">' +
                         '<td colspan="4" style="padding: 20px;">No records to display.</td></tr>';
    updateTotal(0);
    return;
  }

  // Populate table with data
  let totalAmount = 0;
  data.forEach(item => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${escapeHtml(item.description)}</td>
      <td>${escapeHtml(item.valueId)}</td>
      <td>${item.count}</td>
      <td style="text-align: right;">${formatCurrency(item.amount)}</td>
    `;
    tableBody.appendChild(row);
    totalAmount += item.amount;
  });

  updateTotal(totalAmount);
}

function updateTotal(amount) {
  const totalField = document.getElementById('totalField');
  totalField.value = formatCurrency(amount);
}

function handleViewAction() {
  console.log('View action triggered');
  // TODO: Implement view functionality
  displayStatusMessage('View action selected.');
}

function handleEditAction() {
  console.log('Edit action triggered');
  // TODO: Implement edit functionality
  displayStatusMessage('Edit action selected.');
}

function handleDeleteAction() {
  console.log('Delete action triggered');
  // TODO: Implement delete functionality
  displayStatusMessage('Delete action selected.');
}

function handleSaveAction() {
  console.log('Save action triggered');
  
  const currencyIdField = document.getElementById('currencyIdField');
  const currencyId = currencyIdField.value.trim();

  if (!currencyId) {
    displayStatusMessage('Please select a Currency ID before saving.');
    return;
  }

  // TODO: Implement save functionality - submit data to API
  console.log('Saving teller declarations for Currency ID:', currencyId);
  displayStatusMessage('Saving declarations...');
}

function handleCancelAction() {
  console.log('Cancel action triggered');
  
  // Clear form fields
  document.getElementById('currencyIdField').value = '';
  
  // Reset table
  const tableBody = document.getElementById('declarationsTableBody');
  tableBody.innerHTML = '<tr style="text-align: center; color: #64748b; font-size: 0.8rem;">' +
                       '<td colspan="4" style="padding: 20px;">No records to display.</td></tr>';
  
  // Reset total
  updateTotal(0);
  
  // Clear status message
  displayStatusMessage('');
}

function displayStatusMessage(message) {
  const statusElement = document.getElementById('statusMessage');
  if (statusElement) {
    statusElement.textContent = message;
    if (message) {
      statusElement.style.color = '#dc2626';
    }
  }
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
