// Transfer Transactions Module - Event Handlers and Functionality

document.addEventListener('DOMContentLoaded', function() {
  // Initialize module
  initializeTransferTransactions();
  attachEventListeners();
});

function initializeTransferTransactions() {
  // Set default values
  document.getElementById('transferTypeSelect').value = 'Local';
  document.getElementById('branchIdField').value = '0101';
  document.getElementById('accountTypeSelect').value = 'Customer';
}

function attachEventListeners() {
  // Search Buttons
  const accountIdSearchBtn = document.getElementById('accountIdSearchBtn');
  if (accountIdSearchBtn) {
    accountIdSearchBtn.addEventListener('click', function(e) {
      e.preventDefault();
      handleAccountIdSearch();
    });
  }

  const costCenterIdSearchBtn = document.getElementById('costCenterIdSearchBtn');
  if (costCenterIdSearchBtn) {
    costCenterIdSearchBtn.addEventListener('click', function(e) {
      e.preventDefault();
      handleCostCenterIdSearch();
    });
  }

  const transactionIdSearchBtn = document.getElementById('transactionIdSearchBtn');
  if (transactionIdSearchBtn) {
    transactionIdSearchBtn.addEventListener('click', function(e) {
      e.preventDefault();
      handleTransactionIdSearch();
    });
  }

  const transactionCurrencySearchBtn = document.getElementById('transactionCurrencySearchBtn');
  if (transactionCurrencySearchBtn) {
    transactionCurrencySearchBtn.addEventListener('click', function(e) {
      e.preventDefault();
      handleTransactionCurrencySearch();
    });
  }

  // Calendar Buttons
  const valueDateCalendarBtn = document.querySelector('[id="valueDateField"]').parentElement.querySelector('.tt-calendar-btn');
  if (valueDateCalendarBtn) {
    valueDateCalendarBtn.addEventListener('click', function(e) {
      e.preventDefault();
      document.getElementById('valueDateField').click();
    });
  }

  const instrumentDateCalendarBtn = document.querySelector('[id="instrumentDateField"]').parentElement.querySelector('.tt-calendar-btn');
  if (instrumentDateCalendarBtn) {
    instrumentDateCalendarBtn.addEventListener('click', function(e) {
      e.preventDefault();
      document.getElementById('instrumentDateField').click();
    });
  }

  // Content Area Action Buttons
  const nowBtn = document.getElementById('nowBtn');
  if (nowBtn) {
    nowBtn.addEventListener('click', function(e) {
      e.preventDefault();
      handleNowAction();
    });
  }

  const removeBtn = document.getElementById('removeBtn');
  if (removeBtn) {
    removeBtn.addEventListener('click', function(e) {
      e.preventDefault();
      handleRemoveAction();
    });
  }

  const updateBtn = document.getElementById('updateBtn');
  if (updateBtn) {
    updateBtn.addEventListener('click', function(e) {
      e.preventDefault();
      handleUpdateAction();
    });
  }

  const clearBtn = document.getElementById('clearBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', function(e) {
      e.preventDefault();
      handleClearAction();
    });
  }

  // Right Panel Action Buttons
  const viewAllBtn = document.getElementById('viewAllBtn');
  if (viewAllBtn) {
    viewAllBtn.addEventListener('click', function(e) {
      e.preventDefault();
      handleViewAllAction();
    });
  }

  const printBtn = document.getElementById('printBtn');
  if (printBtn) {
    printBtn.addEventListener('click', function(e) {
      e.preventDefault();
      handlePrintAction();
    });
  }

  const accountInfoBtn = document.getElementById('accountInfoBtn');
  if (accountInfoBtn) {
    accountInfoBtn.addEventListener('click', function(e) {
      e.preventDefault();
      handleAccountInfoAction();
    });
  }

  const viewBtn = document.getElementById('viewBtn');
  if (viewBtn) {
    viewBtn.addEventListener('click', function(e) {
      e.preventDefault();
      handleViewAction();
    });
  }

  const addBtn = document.getElementById('addBtn');
  if (addBtn) {
    addBtn.addEventListener('click', function(e) {
      e.preventDefault();
      handleAddAction();
    });
  }

  const editBtn = document.getElementById('editBtn');
  if (editBtn) {
    editBtn.addEventListener('click', function(e) {
      e.preventDefault();
      handleEditAction();
    });
  }

  const rollbackBtn = document.getElementById('rollbackBtn');
  if (rollbackBtn) {
    rollbackBtn.addEventListener('click', function(e) {
      e.preventDefault();
      handleRollBackAction();
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

  // Amount calculation on input
  const transactionAmountField = document.getElementById('transactionAmountField');
  const exchangeRateField = document.getElementById('exchangeRateField');
  
  if (transactionAmountField) {
    transactionAmountField.addEventListener('change', calculateAmounts);
  }
  if (exchangeRateField) {
    exchangeRateField.addEventListener('change', calculateAmounts);
  }
}

function handleAccountIdSearch() {
  const accountIdField = document.getElementById('accountIdField');
  const accountId = accountIdField.value.trim();

  if (!accountId) {
    console.log('Please enter an Account ID to search.');
    return;
  }

  // TODO: Implement API call to search for account
  console.log('Searching for Account ID:', accountId);
}

function handleCostCenterIdSearch() {
  const costCenterIdField = document.getElementById('costCenterIdField');
  const costCenterId = costCenterIdField.value.trim();

  if (!costCenterId) {
    console.log('Please enter a Cost Center ID to search.');
    return;
  }

  // TODO: Implement API call to search for cost center
  console.log('Searching for Cost Center ID:', costCenterId);
}

function handleTransactionIdSearch() {
  const transactionIdField = document.getElementById('transactionIdField');
  const transactionId = transactionIdField.value.trim();

  if (!transactionId) {
    console.log('Please enter a Transaction ID to search.');
    return;
  }

  // TODO: Implement API call to search for transaction
  console.log('Searching for Transaction ID:', transactionId);
}

function handleTransactionCurrencySearch() {
  const transactionCurrencyField = document.getElementById('transactionCurrencyField');
  const transactionCurrency = transactionCurrencyField.value.trim();

  if (!transactionCurrency) {
    console.log('Please enter a Currency to search.');
    return;
  }

  // TODO: Implement API call to search for currency
  console.log('Searching for Currency:', transactionCurrency);
}

function calculateAmounts() {
  const transactionAmount = parseFloat(document.getElementById('transactionAmountField').value) || 0;
  const exchangeRate = parseFloat(document.getElementById('exchangeRateField').value) || 1;
  
  const localAmount = transactionAmount * exchangeRate;
  document.getElementById('localAmountField').value = localAmount.toFixed(2);
  
  // Foreign amount would be transactionAmount if cross currency is checked
  const crossCurrency = document.getElementById('crossCurrencyCheckbox').checked;
  if (crossCurrency) {
    document.getElementById('foreignAmountField').value = transactionAmount.toFixed(2);
  }
}

function handleNowAction() {
  console.log('Now action triggered');
  // Set current date/time
  const now = new Date();
  const toYMD = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const valueDateEl = document.getElementById('valueDateField');
  const instrumentDateEl = document.getElementById('instrumentDateField');
  if (valueDateEl) valueDateEl.value = toYMD(now);
  if (instrumentDateEl) instrumentDateEl.value = toYMD(now);
}

function handleRemoveAction() {
  console.log('Remove action triggered');
  const selectedRow = document.querySelector('#transactionsTableBody tr.selected');
  if (selectedRow) {
    selectedRow.remove();
    updateSummary();
  }
}

function handleUpdateAction() {
  console.log('Update action triggered');
  // TODO: Implement update functionality
}

function handleClearAction() {
  console.log('Clear action triggered');
  
  // Clear form fields (except static ones)
  document.getElementById('serialIdField').value = '';
  document.getElementById('transactionTypeSelect').value = '--Select--';
  document.getElementById('liquidationOptionSelect').value = '--Select--';
  document.getElementById('crossCurrencyCheckbox').checked = false;
  document.getElementById('accountIdField').value = '';
  document.getElementById('costCenterIdField').value = '';
  document.getElementById('valueDateField').value = '';
  document.getElementById('instrumentTypeSelect').value = '--Select--';
  document.getElementById('instrumentIdField').value = '';
  document.getElementById('instrumentDateField').value = '';
  document.getElementById('declarationRefNoField').value = '';
  document.getElementById('transactionIdField').value = '';
  document.getElementById('narrationField').value = '';
  document.getElementById('transactionCurrencyField').value = '';
  document.getElementById('transactionAmountField').value = '';
  document.getElementById('exchangeRateField').value = '';
  document.getElementById('localAmountField').value = '';
  document.getElementById('foreignAmountField').value = '';
}

function handleViewAllAction() {
  console.log('View All action triggered');
  // TODO: Implement view all functionality
}

function handlePrintAction() {
  console.log('Print action triggered');
  window.print();
}

function handleAccountInfoAction() {
  console.log('Account Info action triggered');
  const accountIdField = document.getElementById('accountIdField');
  if (accountIdField.value) {
    // TODO: Open account info dialog/modal
  }
}

function handleViewAction() {
  console.log('View action triggered');
  // TODO: Implement view functionality
}

function handleAddAction() {
  console.log('Add action triggered');
  // Add current form data to table
  addTransactionToTable();
}

function addTransactionToTable() {
  const tableBody = document.getElementById('transactionsTableBody');
  
  // Get form values
  const branchId = document.getElementById('branchIdField').value;
  const accountType = document.getElementById('accountTypeSelect').value;
  const accountId = document.getElementById('accountIdField').value;
  const transactionType = document.getElementById('transactionTypeSelect').value;
  const transactionCurrency = document.getElementById('transactionCurrencyField').value;
  const amount = document.getElementById('transactionAmountField').value;
  const exchangeRate = document.getElementById('exchangeRateField').value;
  const narration = document.getElementById('narrationField').value;

  if (!accountId) {
    console.log('Please select an Account ID');
    return;
  }

  // Remove "No records to display" message if present
  const noRecordsRow = tableBody.querySelector('tr:has(td[colspan="9"])');
  if (noRecordsRow) {
    noRecordsRow.remove();
  }

  // Add new row
  const row = document.createElement('tr');
  row.innerHTML = `
    <td>${escapeHtml(branchId)}</td>
    <td>${escapeHtml(accountType)}</td>
    <td>${escapeHtml(accountId)}</td>
    <td></td>
    <td>${escapeHtml(transactionType)}</td>
    <td>${escapeHtml(transactionCurrency)}</td>
    <td style="text-align: right;">${formatCurrency(parseFloat(amount) || 0)}</td>
    <td style="text-align: right;">${escapeHtml(exchangeRate)}</td>
    <td>${escapeHtml(narration)}</td>
  `;
  
  tableBody.appendChild(row);
  updateSummary();
}

function handleEditAction() {
  console.log('Edit action triggered');
  // TODO: Implement edit functionality
}

function handleRollBackAction() {
  console.log('RollBack action triggered');
  // TODO: Implement rollback functionality
}

function handleSaveAction() {
  console.log('Save action triggered');
  
  // Validate form
  const accountIdField = document.getElementById('accountIdField');
  if (!accountIdField.value) {
    console.log('Please select an Account ID before saving.');
    return;
  }

  // TODO: Implement save functionality - submit data to API
  console.log('Saving transfer transactions...');
}

function handleCancelAction() {
  console.log('Cancel action triggered');
  handleClearAction();
  
  // Clear table
  const tableBody = document.getElementById('transactionsTableBody');
  tableBody.innerHTML = '<tr style="text-align: center; color: #64748b; font-size: 0.8rem;">' +
                       '<td colspan="9" style="padding: 20px;">No records to display.</td></tr>';
  
  updateSummary();
}

function updateSummary() {
  const tableBody = document.getElementById('transactionsTableBody');
  let totalDebit = 0;
  let totalCredit = 0;

  tableBody.querySelectorAll('tr').forEach(row => {
    const amountCell = row.querySelector('td:nth-child(7)');
    if (amountCell) {
      const amount = parseFloat(amountCell.textContent.replace(/[^0-9.-]/g, '')) || 0;
      totalDebit += amount;
    }
  });

  document.getElementById('totalDebitField').value = formatCurrency(totalDebit);
  document.getElementById('totalCreditField').value = formatCurrency(totalCredit);
  document.getElementById('unPostedField').value = '0.00';
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
