/**
 * Debug Helper for Group Collection Reversal
 * Add this to console for quick debugging
 * 
 * Usage in browser console:
 * 1. Open group-collection-reversal.html
 * 2. Copy-paste this entire file into the console
 * 3. Use DEBUG_GCR.test() methods
 */

window.DEBUG_GCR = {
  /**
   * Test dual API calls
   */
  async testDualAPICalls() {
    console.log('🧪 Testing Dual API Calls...\n');
    
    const requestData = {
      CenterID: 'TEST001',
      SchemeID: 'SCH001',
      OperatorID: 'web_portal'
    };
    
    try {
      console.group('📞 Call 1: getGCReversalDetail');
      const result1 = await TransactionService.getGCReversalDetail(requestData);
      console.log('Success:', result1.success);
      console.log('Code:', result1.code);
      console.log('Message:', result1.message);
      console.log('Data:', result1.data);
      console.groupEnd();
      
      console.group('📞 Call 2: getGroupDefaultScheme');
      const result2 = await TransactionService.getGroupDefaultScheme(requestData);
      console.log('Success:', result2.success);
      console.log('Code:', result2.code);
      console.log('Message:', result2.message);
      console.log('Data:', result2.data);
      console.groupEnd();
      
      return {
        reversal: result1,
        scheme: result2
      };
    } catch (error) {
      console.error('❌ Error:', error);
      return null;
    }
  },

  /**
   * Test form field patching
   */
  testFormPatching(mockData) {
    console.log('🧪 Testing Form Patching...\n');
    
    const data = mockData || {
      reversalDetails: {
        CenterID: 'CENTER123',
        SchemeID: 'SCHEME456',
        TscSerial: 'TSC001',
        ReceivedAmount: 5000
      },
      schemeDetails: {
        SchemeID: 'SCHEME789',
        SchemeName: 'Default Scheme'
      }
    };
    
    console.log('Mock Data:', data);
    
    // Test field finding
    const findValueByKeys = (obj, keys) => {
      for (const key of keys) {
        if (obj[key] !== undefined && obj[key] !== null) {
          return obj[key];
        }
      }
      return null;
    };
    
    const centerKeys = ['CenterID', 'centerID', 'centerId', 'center_id'];
    const schemeKeys = ['SchemeID', 'schemeID', 'schemeId', 'scheme_id'];
    
    const centerValue = findValueByKeys(data.reversalDetails, centerKeys);
    const schemeValue = findValueByKeys(data.schemeDetails, schemeKeys);
    
    console.log('✅ Found Center:', centerValue);
    console.log('✅ Found Scheme:', schemeValue);
    
    return { centerValue, schemeValue };
  },

  /**
   * Test table data rendering
   */
  testTableRendering() {
    console.log('🧪 Testing Table Rendering...\n');
    
    const mockReceipts = [
      { TscSerial: 'TSC001', CreatedBy: 'Admin', Supervision: 'Yes', ReceivedAmount: 1000 },
      { TscSerial: 'TSC002', CreatedBy: 'User1', Supervision: 'No', ReceivedAmount: 2000 },
      { TscSerial: 'TSC003', CreatedBy: 'User2', Supervision: 'Yes', ReceivedAmount: 3000 }
    ];
    
    const mockReceiptDetails = [
      { Component: 'Principal', ReceivedAmount: 5000 },
      { Component: 'Interest', ReceivedAmount: 500 },
      { Component: 'Penalty', ReceivedAmount: 100 }
    ];
    
    const mockClientWise = [
      { ClientID: 'C001', ClientName: 'John Doe', ReceivedAmount: 2000 },
      { ClientID: 'C002', ClientName: 'Jane Smith', ReceivedAmount: 3600 }
    ];
    
    console.group('📊 Receipt Table (3 rows)');
    console.table(mockReceipts);
    console.groupEnd();
    
    console.group('📊 Receipt Details Table (3 rows)');
    console.table(mockReceiptDetails);
    console.groupEnd();
    
    console.group('📊 Client Wise Table (2 rows)');
    console.table(mockClientWise);
    console.groupEnd();
    
    return {
      receipts: mockReceipts,
      receiptDetails: mockReceiptDetails,
      clientWise: mockClientWise
    };
  },

  /**
   * Test receipt selection
   */
  testReceiptSelection() {
    console.log('🧪 Testing Receipt Selection...\n');
    
    if (typeof window.GCReversal_selectReceipt === 'function') {
      console.log('✅ Selection function exists');
      console.log('Try clicking a receipt row in the table');
      return true;
    } else {
      console.error('❌ Selection function not found');
      return false;
    }
  },

  /**
   * Simulate search with test data
   */
  async simulateSearch(centerId = 'TEST001', schemeId = 'SCH001') {
    console.log('🔍 Simulating Search...\n');
    console.log('Center ID:', centerId);
    console.log('Scheme ID:', schemeId);
    
    const centerField = document.getElementById('centerIdField');
    const schemeField = document.getElementById('schemeIdField');
    
    if (centerField) centerField.value = centerId;
    if (schemeField) schemeField.value = schemeId;
    
    console.log('✅ Form fields populated');
    console.log('Now click a search button to trigger the API call');
  },

  /**
   * Check current state
   */
  checkState() {
    console.log('🔍 Current State Check...\n');
    
    console.group('📋 Services');
    console.log('TransactionService:', typeof TransactionService);
    console.log('LookupService:', typeof LookupService);
    console.log('CoreApi:', typeof CoreApi);
    console.groupEnd();
    
    console.group('📋 Form Fields');
    console.log('centerIdField:', document.getElementById('centerIdField')?.value || 'empty');
    console.log('schemeIdField:', document.getElementById('schemeIdField')?.value || 'empty');
    console.groupEnd();
    
    console.group('📋 Table Data');
    const receiptRows = document.querySelectorAll('#receiptTableBody tr');
    const detailRows = document.querySelectorAll('#receiptDetailsTableBody tr');
    const clientRows = document.querySelectorAll('#clientWiseDetailsTableBody tr');
    console.log('Receipt rows:', receiptRows.length);
    console.log('Detail rows:', detailRows.length);
    console.log('Client rows:', clientRows.length);
    console.groupEnd();
    
    console.group('📋 Buttons');
    console.log('viewBtn:', document.getElementById('viewBtn') ? 'exists' : 'missing');
    console.log('editBtn:', document.getElementById('editBtn') ? 'exists' : 'missing');
    console.log('saveBtn:', document.getElementById('saveBtn') ? 'exists' : 'missing');
    console.log('cancelBtn:', document.getElementById('cancelBtn') ? 'exists' : 'missing');
    console.groupEnd();
  },

  /**
   * Run all tests
   */
  async runAll() {
    console.log('🚀 Running All Debug Tests...\n');
    
    this.checkState();
    await new Promise(r => setTimeout(r, 1000));
    
    await this.testDualAPICalls();
    await new Promise(r => setTimeout(r, 1000));
    
    this.testFormPatching();
    await new Promise(r => setTimeout(r, 1000));
    
    this.testTableRendering();
    await new Promise(r => setTimeout(r, 1000));
    
    this.testReceiptSelection();
    
    console.log('\n✅ All debug tests completed!');
  },

  /**
   * Show help
   */
  help() {
    console.log(`
%c📚 DEBUG_GCR Helper Commands

Available Methods:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  DEBUG_GCR.checkState()
    → Check current module state
  
  DEBUG_GCR.testDualAPICalls()
    → Test both API calls (async)
  
  DEBUG_GCR.testFormPatching(mockData?)
    → Test form field patching
  
  DEBUG_GCR.testTableRendering()
    → Test table data rendering
  
  DEBUG_GCR.testReceiptSelection()
    → Check receipt selection function
  
  DEBUG_GCR.simulateSearch(centerId, schemeId)
    → Fill search fields
  
  DEBUG_GCR.runAll()
    → Run all tests (async)
  
  DEBUG_GCR.help()
    → Show this help message

Example Usage:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  await DEBUG_GCR.testDualAPICalls();
  DEBUG_GCR.simulateSearch('CENTER123', 'SCH456');
  await DEBUG_GCR.runAll();

`, 'color: #5b9fd9; font-weight: bold;');
  }
};

// Auto-show help
console.log('%c✅ DEBUG_GCR Helper Loaded!', 'color: green; font-size: 14px; font-weight: bold;');
console.log('%cType DEBUG_GCR.help() for available commands', 'color: #5b9fd9;');
