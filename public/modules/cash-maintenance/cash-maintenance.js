// Cash Maintenance Module
const CashMaintenancePage = (function() {
  'use strict';

  // Configuration
  const MODULE_ID = 'cash-maintenance';

  // DOM Reference Cache
  let domCache = {};

  // Initialize Page
  function initialize() {
    cacheDOM();
    attachEventListeners();
  }

  // Cache DOM References
  function cacheDOM() {
    domCache = {
      // Query Fields
      serialNoField: document.getElementById('serialNoField'),
      serialNoSearchBtn: document.getElementById('serialNoSearchBtn'),
      fromTillIdField: document.getElementById('fromTillIdField'),
      fromTillIdSearchBtn: document.getElementById('fromTillIdSearchBtn'),
      currencyIdField: document.getElementById('currencyIdField'),
      currencyIdSearchBtn: document.getElementById('currencyIdSearchBtn'),
      transactionTypeSelect: document.getElementById('transactionTypeSelect'),
      fixedAmountField: document.getElementById('fixedAmountField'),
      fixedAmountSearchBtn: document.getElementById('fixedAmountSearchBtn'),
      toBranchIdField: document.getElementById('toBranchIdField'),
      toBranchIdSearchBtn: document.getElementById('toBranchIdSearchBtn'),
      toTillIdField: document.getElementById('toTillIdField'),
      toTillIdSearchBtn: document.getElementById('toTillIdSearchBtn'),

      // Tab Elements
      denominationsTab: document.getElementById('denominationsTab'),
      numbersTab: document.getElementById('numbersTab'),
      paymentTab: document.getElementById('paymentTab'),
      receiptTab: document.getElementById('receiptTab'),
      denominationsContent: document.getElementById('denominationsContent'),
      numbersContent: document.getElementById('numbersContent'),
      paymentContent: document.getElementById('paymentContent'),
      receiptContent: document.getElementById('receiptContent'),

      // Table Bodies
      denominationsTableBody: document.getElementById('denominationsTableBody'),
      numbersTableBody: document.getElementById('numbersTableBody'),
      paymentTableBody: document.getElementById('paymentTableBody'),
      receiptTableBody: document.getElementById('receiptTableBody'),

      // Behind The Scene Fields
      createdByField: document.getElementById('createdByField'),
      createdOnField: document.getElementById('createdOnField'),
      transactionStatusField: document.getElementById('transactionStatusField'),
      statusMessage: document.getElementById('statusMessage'),

      // Action Buttons
      viewAllBtn: document.getElementById('viewAllBtn'),
      denominationBtn: document.getElementById('denominationBtn'),
      printBtn: document.getElementById('printBtn'),
      viewBtn: document.getElementById('viewBtn'),
      addBtn: document.getElementById('addBtn'),
      deleteBtn: document.getElementById('deleteBtn'),
      saveBtn: document.getElementById('saveBtn'),
      cancelBtn: document.getElementById('cancelBtn')
    };
  }

  // Attach Event Listeners
  function attachEventListeners() {
    // Search Buttons
    if (domCache.serialNoSearchBtn) {
      domCache.serialNoSearchBtn.addEventListener('click', () => handleSearch('Serial No'));
    }
    if (domCache.fromTillIdSearchBtn) {
      domCache.fromTillIdSearchBtn.addEventListener('click', () => handleSearch('From Till ID'));
    }
    if (domCache.currencyIdSearchBtn) {
      domCache.currencyIdSearchBtn.addEventListener('click', () => handleSearch('Currency ID'));
    }
    if (domCache.fixedAmountSearchBtn) {
      domCache.fixedAmountSearchBtn.addEventListener('click', () => handleSearch('Fixed Amount'));
    }
    if (domCache.toBranchIdSearchBtn) {
      domCache.toBranchIdSearchBtn.addEventListener('click', () => handleSearch('To Branch ID'));
    }
    if (domCache.toTillIdSearchBtn) {
      domCache.toTillIdSearchBtn.addEventListener('click', () => handleSearch('To Till ID'));
    }

    // Tab Switching
    if (domCache.denominationsTab) {
      domCache.denominationsTab.addEventListener('click', () => switchTab('denominations'));
    }
    if (domCache.numbersTab) {
      domCache.numbersTab.addEventListener('click', () => switchTab('numbers'));
    }
    if (domCache.paymentTab) {
      domCache.paymentTab.addEventListener('click', () => switchTab('payment'));
    }
    if (domCache.receiptTab) {
      domCache.receiptTab.addEventListener('click', () => switchTab('receipt'));
    }

    // Action Buttons
    if (domCache.viewAllBtn) {
      domCache.viewAllBtn.addEventListener('click', handleViewAll);
    }
    if (domCache.denominationBtn) {
      domCache.denominationBtn.addEventListener('click', handleDenomination);
    }
    if (domCache.printBtn) {
      domCache.printBtn.addEventListener('click', handlePrint);
    }
    if (domCache.viewBtn) {
      domCache.viewBtn.addEventListener('click', handleView);
    }
    if (domCache.addBtn) {
      domCache.addBtn.addEventListener('click', handleAdd);
    }
    if (domCache.deleteBtn) {
      domCache.deleteBtn.addEventListener('click', handleDelete);
    }
    if (domCache.saveBtn) {
      domCache.saveBtn.addEventListener('click', handleSave);
    }
    if (domCache.cancelBtn) {
      domCache.cancelBtn.addEventListener('click', handleCancel);
    }
  }

  // Search Handler
  function handleSearch(fieldName) {
    console.log('Searching for:', fieldName);
    // In production, this would open a lookup dialog
    alert(`Search for ${fieldName}`);
  }

  // Tab Switching
  function switchTab(tabName) {
    // Remove active class from all tabs
    document.querySelectorAll('.cash-maintenance .cm-tab').forEach(tab => {
      tab.classList.remove('cm-tab-active');
    });

    // Hide all content
    document.querySelectorAll('.cash-maintenance .cm-tab-content').forEach(content => {
      content.classList.remove('cm-tab-content-active');
      content.style.display = 'none';
    });

    // Add active class to clicked tab
    const activeTab = document.querySelector(`.cash-maintenance .cm-tab[data-tab="${tabName}"]`);
    if (activeTab) {
      activeTab.classList.add('cm-tab-active');
    }

    // Show content for active tab
    const contentId = tabName + 'Content';
    const activeContent = document.getElementById(contentId);
    if (activeContent) {
      activeContent.classList.add('cm-tab-content-active');
      activeContent.style.display = 'block';
    }

    console.log('Switched to tab:', tabName);
  }

  // View All Handler
  function handleViewAll() {
    console.log('View All clicked');
    alert('View all cash records');
  }

  // Denomination Handler
  function handleDenomination() {
    console.log('Denomination clicked');
    alert('View denomination details');
  }

  // Print Handler
  function handlePrint() {
    console.log('Print clicked');
    window.print();
  }

  // View Handler
  function handleView() {
    console.log('View clicked');
    alert('View selected record details');
  }

  // Add Handler
  function handleAdd() {
    console.log('Add clicked');
    // Clear form fields
    if (domCache.serialNoField) domCache.serialNoField.value = '';
    if (domCache.fromTillIdField) domCache.fromTillIdField.value = '';
    if (domCache.currencyIdField) domCache.currencyIdField.value = '';
    if (domCache.transactionTypeSelect) domCache.transactionTypeSelect.value = '';
    if (domCache.fixedAmountField) domCache.fixedAmountField.value = '';
    if (domCache.toBranchIdField) domCache.toBranchIdField.value = '';
    if (domCache.toTillIdField) domCache.toTillIdField.value = '';
    alert('Ready to add new cash maintenance record');
  }

  // Delete Handler
  function handleDelete() {
    console.log('Delete clicked');
    const confirmed = confirm('Are you sure you want to delete this record?');
    if (confirmed) {
      alert('Record deleted successfully');
    }
  }

  // Save Handler
  function handleSave() {
    console.log('Save clicked');
    const serialNo = domCache.serialNoField ? domCache.serialNoField.value : '';
    if (!serialNo) {
      alert('Please enter Serial No');
      return;
    }
    alert('Record saved successfully');
  }

  // Cancel Handler
  function handleCancel() {
    console.log('Cancel clicked');
    // Reset form
    if (domCache.serialNoField) domCache.serialNoField.value = '';
    if (domCache.fromTillIdField) domCache.fromTillIdField.value = '';
    if (domCache.currencyIdField) domCache.currencyIdField.value = '';
    if (domCache.transactionTypeSelect) domCache.transactionTypeSelect.value = '';
    if (domCache.fixedAmountField) domCache.fixedAmountField.value = '';
    if (domCache.toBranchIdField) domCache.toBranchIdField.value = '';
    if (domCache.toTillIdField) domCache.toTillIdField.value = '';
    alert('Form cancelled and reset');
  }

  // Public API
  return {
    init: initialize
  };
})();

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
  CashMaintenancePage.init();
});
