// Supervision Transactions Module
const SupervisionTransactionsPage = (function() {
  'use strict';

  // Configuration
  const MODULE_ID = 'supervision-transactions';

  // DOM Reference Cache
  let domCache = {};

  // Initialize Page
  function initialize() {
    cacheDOM();
    attachEventListeners();
    loadInitialData();
  }

  // Cache DOM References
  function cacheDOM() {
    domCache = {
      // Table
      transactionTableBody: document.getElementById('transactionTableBody'),

      // Remarks
      remarksField: document.getElementById('remarksField'),

      // Checkbox
      lockingForApprovalCheckbox: document.getElementById('lockingForApprovalCheckbox'),

      // Action Buttons
      superviseBtn: document.getElementById('superviseBtn'),
      rejectBtn: document.getElementById('rejectBtn')
    };
  }

  // Attach Event Listeners
  function attachEventListeners() {
    if (domCache.superviseBtn) {
      domCache.superviseBtn.addEventListener('click', handleSupervise);
    }
    if (domCache.rejectBtn) {
      domCache.rejectBtn.addEventListener('click', handleReject);
    }
    if (domCache.lockingForApprovalCheckbox) {
      domCache.lockingForApprovalCheckbox.addEventListener('change', handleLockingChange);
    }
  }

  // Load Initial Data
  function loadInitialData() {
    // Sample data - in production this would come from an API
    const sampleTransactions = [
      // Uncomment to show sample data
      // {
      //   userId: 'USER001',
      //   transactionType: 'DEP',
      //   accountName: 'Main Account',
      //   amount: '10,000.00',
      //   trxBranchId: 'BR001'
      // }
    ];

    if (sampleTransactions.length > 0) {
      renderTransactions(sampleTransactions);
    }
  }

  // Render Transactions
  function renderTransactions(transactions) {
    if (!domCache.transactionTableBody) return;

    domCache.transactionTableBody.innerHTML = '';

    if (transactions.length === 0) {
      const row = document.createElement('tr');
      row.style.textAlign = 'center';
      row.style.color = '#64748b';
      row.style.fontSize = '0.8rem';
      row.innerHTML = `<td colspan="5" style="padding: 20px;">No records to display.</td>`;
      domCache.transactionTableBody.appendChild(row);
      return;
    }

    transactions.forEach((trx) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${trx.userId || ''}</td>
        <td>${trx.transactionType || ''}</td>
        <td>${trx.accountName || ''}</td>
        <td>${trx.amount || ''}</td>
        <td>${trx.trxBranchId || ''}</td>
      `;
      domCache.transactionTableBody.appendChild(row);
    });
  }

  // Supervise Handler
  function handleSupervise() {
    console.log('Supervise clicked');
    const remarks = domCache.remarksField ? domCache.remarksField.value : '';
    const lockingForApproval = domCache.lockingForApprovalCheckbox ? domCache.lockingForApprovalCheckbox.checked : false;

    if (!remarks) {
      alert('Please enter remarks before supervising');
      return;
    }

    console.log('Supervising with remarks:', remarks, 'Locking:', lockingForApproval);
    alert('Transaction(s) supervised successfully');
  }

  // Reject Handler
  function handleReject() {
    console.log('Reject clicked');
    const remarks = domCache.remarksField ? domCache.remarksField.value : '';

    if (!remarks) {
      alert('Please enter remarks before rejecting');
      return;
    }

    const confirmed = confirm('Are you sure you want to reject this/these transaction(s)?');
    if (confirmed) {
      console.log('Rejecting with remarks:', remarks);
      alert('Transaction(s) rejected successfully');
      clearForm();
    }
  }

  // Locking For Approval Change Handler
  function handleLockingChange() {
    const isLocking = domCache.lockingForApprovalCheckbox ? domCache.lockingForApprovalCheckbox.checked : false;
    console.log('Locking For Approval:', isLocking);
  }

  // Clear Form
  function clearForm() {
    if (domCache.remarksField) domCache.remarksField.value = '';
    if (domCache.lockingForApprovalCheckbox) domCache.lockingForApprovalCheckbox.checked = false;
  }

  // Public API
  return {
    init: initialize
  };
})();

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
  SupervisionTransactionsPage.init();
});
