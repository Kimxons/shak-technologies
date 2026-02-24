/**
 * 🔧 DEBUGGING HELPER SCRIPT
 * Paste this into browser console for quick debugging
 */

// Global debugging object
window.DEBUG_GCA = {
  
  // Check if all services loaded
  checkServices() {
    console.group('📦 Service Status');
    console.log('TransactionService:', !!window.TransactionService ? '✅ Loaded' : '❌ Not Loaded');
    console.log('LookupService:', !!window.LookupService ? '✅ Loaded' : '❌ Not Loaded');
    console.log('SearchService:', !!window.SearchService ? '✅ Loaded' : '❌ Not Loaded');
    console.log('CoreApi:', !!window.CoreApi ? '✅ Loaded' : '❌ Not Loaded');
    console.log('Environment:', !!window.Environment ? '✅ Loaded' : '❌ Not Loaded');
    console.log('ServiceLoader:', !!window.ServiceLoader ? '✅ Loaded' : '❌ Not Loaded');
    console.groupEnd();
    
    if (window.TransactionService) {
      console.log('\nTransactionService Methods:', Object.keys(window.TransactionService));
    }
  },
  
  // Check environment configuration
  checkEnvironment() {
    console.group('🌍 Environment Config');
    if (window.Environment) {
      console.log('Name:', window.Environment.name);
      console.log('baseUrlTransaction:', window.Environment.baseUrlTransaction);
      console.log('baseUrlSystemCodes:', window.Environment.baseUrlSystemCodes);
      console.log('baseUrlCommon:', window.Environment.baseUrlCommon);
      console.log('baseUrlClient:', window.Environment.baseUrlClient);
      console.log('baseUrlAuth:', window.Environment.baseUrlAuth);
    } else {
      console.error('❌ Environment not loaded');
    }
    console.groupEnd();
  },
  
  // Test API call with sample data
  async testAPI(groupId = 1, allocationType = 'Custom') {
    console.group('🧪 Testing API Call');
    
    if (!window.TransactionService) {
      console.error('❌ TransactionService not loaded');
      console.groupEnd();
      return;
    }
    
    const requestData = {
      OurBranchID: '002',
      TrxSerialID: parseInt(groupId),
      AllocationTypeID: allocationType,
      OperatorID: 'web_portal'
    };
    
    console.log('Request Data:', requestData);
    
    try {
      const result = await window.TransactionService.getGCLoanCollection(requestData);
      console.log('Success:', result.success);
      console.log('Code:', result.code);
      console.log('Message:', result.message);
      console.log('Data:', result.data);
      console.groupEnd();
      return result;
    } catch (error) {
      console.error('Error:', error);
      console.groupEnd();
      throw error;
    }
  },
  
  // Get current form values
  getFormValues() {
    console.group('📝 Current Form Values');
    console.log('Group ID:', document.getElementById('groupIdField')?.value || 'Empty');
    console.log('Scheme ID:', document.getElementById('schemeIdField')?.value || 'Empty');
    console.log('Value Date:', document.getElementById('valueDateField')?.value || 'Empty');
    console.log('Allocation Type:', document.getElementById('allocationTypeSelect')?.value || 'Empty');
    console.groupEnd();
  },
  
  // Count table rows
  checkTables() {
    console.group('📊 Table Status');
    const savingsRows = document.querySelectorAll('#savingsTableBody tr[data-row-index]').length;
    const loansRows = document.querySelectorAll('#loansTableBody tr[data-row-index]').length;
    const othersRows = document.querySelectorAll('#othersTableBody tr[data-row-index]').length;
    
    console.log('Savings rows:', savingsRows);
    console.log('Loans rows:', loansRows);
    console.log('Others rows:', othersRows);
    console.log('Total rows:', savingsRows + loansRows + othersRows);
    console.groupEnd();
  },
  
  // Check button status
  checkButtons() {
    console.group('🔘 Button Status');
    const buttons = ['viewBtn', 'editBtn', 'deleteBtn', 'saveBtn', 'cancelBtn'];
    buttons.forEach(btnId => {
      const btn = document.getElementById(btnId);
      if (btn) {
        console.log(`${btnId}:`, btn.disabled ? '❌ Disabled' : '✅ Enabled');
      } else {
        console.log(`${btnId}: ⚠️ Not Found`);
      }
    });
    console.groupEnd();
  },
  
  // Test with mock data
  testWithMockData() {
    console.group('🎭 Testing with Mock Data');
    
    const mockData = {
      Details: [
        {
          GroupID: 'GRP001',
          ClientID: 'CLI001',
          AccountID: 'ACC001',
          ClientName: 'John Doe',
          ExpectedAmount: 1000.50,
          ReceivedAmount: 1000.50
        },
        {
          GroupID: 'GRP001',
          ClientID: 'CLI002',
          AccountID: 'ACC002',
          ClientName: 'Jane Smith',
          ExpectedAmount: 2500.75,
          ReceivedAmount: 2000.00
        },
        {
          GroupID: 'GRP001',
          ClientID: 'CLI003',
          AccountID: 'ACC003',
          ClientName: 'Bob Johnson',
          ExpectedAmount: 1500.00,
          ReceivedAmount: 1500.00
        }
      ],
      totalAllocated: 5001.25,
      totalReceived: 4500.50,
      unallocated: 500.75,
      createdBy: 'Test User',
      createdOn: new Date().toISOString(),
      modifiedBy: 'Test User',
      modifiedOn: new Date().toISOString()
    };
    
    console.log('Mock Data Created:', mockData);
    console.log('You can now call: window.displayAllocationData(mockData)');
    console.groupEnd();
    
    return mockData;
  },
  
  // Full system check
  fullCheck() {
    console.log('🔍 Running Full System Check...\n');
    this.checkServices();
    console.log('');
    this.checkEnvironment();
    console.log('');
    this.getFormValues();
    console.log('');
    this.checkTables();
    console.log('');
    this.checkButtons();
    console.log('\n✅ Full check complete!');
  },
  
  // Quick help
  help() {
    console.log(`
🔧 DEBUG_GCA Helper Commands:

DEBUG_GCA.checkServices()       - Check if all services are loaded
DEBUG_GCA.checkEnvironment()    - Check environment configuration
DEBUG_GCA.testAPI(groupId, type) - Test API call (default: groupId=1, type='Custom')
DEBUG_GCA.getFormValues()       - Get current form field values
DEBUG_GCA.checkTables()         - Count rows in all tables
DEBUG_GCA.checkButtons()        - Check button enabled/disabled status
DEBUG_GCA.testWithMockData()    - Create mock data for testing
DEBUG_GCA.fullCheck()           - Run all checks at once
DEBUG_GCA.help()                - Show this help message

Examples:
  DEBUG_GCA.fullCheck()
  DEBUG_GCA.testAPI(5, 'Custom')
  const mockData = DEBUG_GCA.testWithMockData()
    `);
  }
};

// Auto-run on load
console.log('🔧 DEBUG_GCA Helper Loaded!');
console.log('Type DEBUG_GCA.help() for available commands');
console.log('Type DEBUG_GCA.fullCheck() to run all checks');

// Make it easier to access
window.debug = window.DEBUG_GCA;

console.log('\n💡 Tip: You can also use window.debug instead of window.DEBUG_GCA');
