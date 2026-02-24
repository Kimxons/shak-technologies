(function() {
  'use strict';

  const bankReconciliationManual = {
    // State management
    state: {
      isEditMode: false,
      glTransactions: [],
      bankTransactions: [],
      reconciledItems: [],
      branchId: '',
      glAccountId: '',
      batchNo: '',
      dataLoadedAt: null,
      isReconciling: false,
      isSaving: false,
      batchSaved: false
    },

    // Show success alert notification
    showSuccessAlert: function(message) {
      const alertDiv = document.createElement('div');
      alertDiv.className = 'brm-success-alert';
      alertDiv.innerHTML = `
        <div class="brm-success-alert-content">
          <i class="bi bi-check-circle-fill"></i>
          <span>${message}</span>
        </div>
      `;
      
      document.body.appendChild(alertDiv);
      
      setTimeout(() => alertDiv.classList.add('show'), 10);
      
      setTimeout(() => {
        alertDiv.classList.remove('show');
        setTimeout(() => alertDiv.remove(), 300);
      }, 3000);
    },

    init: async function() {
      await this.loadServices();
      this.cacheElements();
      this.bindEvents();
      this.setInitialButtonStates();
      console.log('[BankReconciliationManual] Module initialized successfully');
    },

    loadServices: async function() {
      try {
        console.log('[BankReconciliationManual] Loading services...');
        
        if (!window.CoreApi) {
          throw new Error('CoreApi not loaded. Please ensure coreApi.js is included.');
        }
        console.log('[BankReconciliationManual] CoreApi available');

        if (!window.OtherModuleService) {
          throw new Error('OtherModuleService not loaded. Please ensure otherModuleService.js is included.');
        }
        console.log('[BankReconciliationManual] OtherModuleService available');

        if (!window.GLAccountSearchService) {
          throw new Error('GLAccountSearchService not loaded. Please ensure glAccountSearchService.js is included.');
        }
        console.log('[BankReconciliationManual] GLAccountSearchService available');

        if (!window.BatchSearchService) {
          throw new Error('BatchSearchService not loaded. Please ensure batchSearchService.js is included.');
        }
        console.log('[BankReconciliationManual] BatchSearchService available');

        console.log('[BankReconciliationManual] Services loaded successfully');
      } catch (error) {
        console.error('[BankReconciliationManual] Error loading services:', error);
        alert('Failed to load required services: ' + error.message);
        throw error;
      }
    },

    cacheElements: function() {
      // Query Form Fields
      this.branchIdInput = document.querySelector('input[data-field="branchId"]');
      this.glAccountIdInput = document.querySelector('input[data-field="glAccountId"]');
      this.batchNoInput = document.querySelector('input[data-field="batchNo"]');

      // Summary Fields
      this.glTrxAmountInput = document.querySelector('input[data-field="glTrxAmount"]');
      this.bankTrxAmountInput = document.querySelector('input[data-field="bankTrxAmount"]');
      this.differenceInput = document.querySelector('input[data-field="difference"]');

      // Tables
      const allTables = document.querySelectorAll('.table tbody');
      this.glTransactionTable = allTables[0]; // First table (GL Transaction)
      this.bankTransactionTable = allTables[1]; // Second table (Bank Account Transaction)

      // Action Buttons
      this.viewBtn = document.querySelector('[data-action="view"]');
      this.editBtn = document.querySelector('[data-action="edit"]');
      this.saveBtn = document.querySelector('[data-action="save"]');
      this.reconcileBtn = document.querySelectorAll('[data-action="reconcile"]');
      this.cancelBtn = document.querySelector('[data-action="cancel"]');

      // Search Buttons
      this.searchBranchBtn = document.querySelector('[data-action="searchBranch"]');
      this.searchGLAccountBtn = document.querySelector('[data-action="searchGLAccount"]');
      this.searchBatchBtn = document.querySelector('[data-action="searchBatch"]');
      
      console.log('[BankReconciliationManual] Search buttons cached:', {
        searchBranch: !!this.searchBranchBtn,
        searchGLAccount: !!this.searchGLAccountBtn,
        searchBatch: !!this.searchBatchBtn
      });
    },

    bindEvents: function() {
      console.log('[BankReconciliationManual] Binding events to buttons...');
      if (this.viewBtn) {
        console.log('[BankReconciliationManual] View button found, attaching click handler');
        this.viewBtn.addEventListener('click', () => this.handleView());
      } else {
        console.error('[BankReconciliationManual] View button NOT found!');
      }
      if (this.editBtn) this.editBtn.addEventListener('click', () => this.handleEdit());
      if (this.saveBtn) this.saveBtn.addEventListener('click', () => this.handleSave());
      if (this.reconcileBtn) {
        this.reconcileBtn.forEach(btn => {
          btn.addEventListener('click', () => this.handleReconcile());
        });
      }
      if (this.cancelBtn) this.cancelBtn.addEventListener('click', () => this.handleCancel());

      // Search button events
      if (this.searchBranchBtn) {
        this.searchBranchBtn.addEventListener('click', () => this.handleSearchBranch());
        console.log('[BankReconciliationManual] ✓ Branch search button event bound');
      }
      if (this.searchGLAccountBtn) {
        this.searchGLAccountBtn.addEventListener('click', () => this.handleSearchGLAccount());
        console.log('[BankReconciliationManual] ✓ GL Account search button event bound');
      }
      if (this.searchBatchBtn) {
        this.searchBatchBtn.addEventListener('click', () => this.handleSearchBatch());
        console.log('[BankReconciliationManual] ✓ Batch search button event bound');
      }
    },

    setInitialButtonStates: function() {
      console.log('[BankReconciliationManual] Setting initial button states');
      // Disable save and reconcile buttons initially
      if (this.saveBtn) this.saveBtn.disabled = true;
      if (this.editBtn) this.editBtn.disabled = true;
      if (this.reconcileBtn) {
        this.reconcileBtn.forEach(btn => btn.disabled = true);
      }
      // Disable all checkboxes initially
      this.setCheckboxStates(false);
    },

    setCheckboxStates: function(enabled) {
      // Query checkboxes from both tables
      const glCheckboxes = this.glTransactionTable?.querySelectorAll('input[type="checkbox"]') || [];
      const bankCheckboxes = this.bankTransactionTable?.querySelectorAll('input[type="checkbox"]') || [];
      
      const allCheckboxes = [...glCheckboxes, ...bankCheckboxes];
      
      console.log(`[BankReconciliationManual] Found ${glCheckboxes.length} GL checkboxes, ${bankCheckboxes.length} Bank checkboxes`);
      
      allCheckboxes.forEach(checkbox => {
        checkbox.disabled = !enabled;
        if (!enabled) checkbox.checked = false;
      });
      
      console.log(`[BankReconciliationManual] ${allCheckboxes.length} checkboxes ${enabled ? 'enabled' : 'disabled'}`);
      
      // Update totals after changing checkbox states
      if (!enabled) {
        this.updateSelectedTotals();
      }
    },

    attachCheckboxListeners: function() {
      const glCheckboxes = this.glTransactionTable?.querySelectorAll('input[type="checkbox"]') || [];
      const bankCheckboxes = this.bankTransactionTable?.querySelectorAll('input[type="checkbox"]') || [];
      
      const allCheckboxes = [...glCheckboxes, ...bankCheckboxes];
      
      allCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => this.updateSelectedTotals());
      });
      
      console.log('[BankReconciliationManual] Attached listeners to', allCheckboxes.length, 'checkboxes');
    },

    updateSelectedTotals: function() {
      let glTotal = 0;
      let bankTotal = 0;
      
      // Calculate GL total from checked items
      const glCheckboxes = this.glTransactionTable?.querySelectorAll('input[type="checkbox"][data-table="gl"]:checked') || [];
      glCheckboxes.forEach(checkbox => {
        const index = parseInt(checkbox.dataset.index);
        const transaction = this.state.glTransactions[index];
        if (transaction) {
          glTotal += parseFloat(transaction.LocalAmount) || 0;
        }
      });
      
      // Calculate Bank total from checked items
      const bankCheckboxes = this.bankTransactionTable?.querySelectorAll('input[type="checkbox"][data-table="bank"]:checked') || [];
      bankCheckboxes.forEach(checkbox => {
        const index = parseInt(checkbox.dataset.index);
        const transaction = this.state.bankTransactions[index];
        if (transaction) {
          bankTotal += parseFloat(transaction.TrxAmount || transaction.TransactionAmount) || 0;
        }
      });
      
      // Calculate difference
      const difference = glTotal - bankTotal;
      
      // Update input fields
      if (this.glTrxAmountInput) {
        this.glTrxAmountInput.value = glTotal.toFixed(2);
      }
      if (this.bankTrxAmountInput) {
        this.bankTrxAmountInput.value = bankTotal.toFixed(2);
      }
      if (this.differenceInput) {
        this.differenceInput.value = difference.toFixed(2);
      }
      
      console.log('[BankReconciliationManual] Updated totals - GL:', glTotal.toFixed(2), 'Bank:', bankTotal.toFixed(2), 'Diff:', difference.toFixed(2));
    },

    handleView: async function() {
      console.log('[BankReconciliationManual] ============ VIEW BUTTON CLICKED ============');

      const branchId = this.branchIdInput?.value?.trim();
      const glAccountId = this.glAccountIdInput?.value?.trim();
      const batchNo = this.batchNoInput?.value?.trim();
      
      console.log('[BankReconciliationManual] Input values:', { branchId, glAccountId, batchNo });

      if (!branchId) {
        alert('Please enter Branch ID');
        this.branchIdInput?.focus();
        return;
      }

      try {
        const requestData = {
          BankID: '00',
          OurBranchID: branchId,
          AccountID: glAccountId || '',
          BatchNo: batchNo || '',
          OperatorID: 'CSADM'
        };

        console.log('[BankReconciliationManual] Calling API with:', requestData);

        const result = await OtherModuleService.getBankReconManual(requestData);

        console.log('[BankReconciliationManual] API Response received:', result);

        if (result && result.success) {
          const data = result.data;
          
          console.log('[BankReconciliationManual] Response data structure:', data);
          console.log('[BankReconciliationManual] Details array:', data.Details);
          console.log('[BankReconciliationManual] Details01 array:', data.Details01);
          
          // Check if both Details and Details01 are empty
          const hasGLData = data.Details && Array.isArray(data.Details) && data.Details.length > 0;
          const hasBankData = data.Details01 && Array.isArray(data.Details01) && data.Details01.length > 0;
          
          if (!hasGLData && !hasBankData) {
            alert('No data found for the specified criteria');
            console.warn('[BankReconciliationManual] No transaction data found');
            return;
          }
          
          // Store state
          this.state.glTransactions = data.Details || [];
          this.state.bankTransactions = data.Details01 || [];
          this.state.branchId = branchId;
          this.state.glAccountId = glAccountId || '';
          this.state.batchNo = batchNo || '';
          this.state.reconciledItems = [];
          this.state.isEditMode = false;
          this.state.dataLoadedAt = new Date();
          
          this.populateData(data);
          
          // Enable edit button after data is loaded
          if (this.editBtn) this.editBtn.disabled = false;
          
          // Show success alert
          const glCount = this.state.glTransactions.length;
          const bankCount = this.state.bankTransactions.length;
          this.showSuccessAlert(`Bank reconciliation data loaded successfully! (${glCount} GL transactions, ${bankCount} Bank transactions)`);
        } else {
          const errorMessage = result?.message || 'No data found';
          console.warn('[BankReconciliationManual] API returned non-success:', errorMessage);
          alert(errorMessage);
        }
      } catch (error) {
        console.error('[BankReconciliationManual] Error loading data:', error);
        alert('Failed to load bank reconciliation manual data: ' + error.message);
      }
    },

    populateData: function(data) {
      console.log('[BankReconciliationManual] Populating data:', data);
      
      // Populate GL Transaction table (Details)
      if (data.Details && Array.isArray(data.Details)) {
        this.populateGLTable(data.Details);
      }

      // Populate Bank Transaction table (Details01)
      if (data.Details01 && Array.isArray(data.Details01)) {
        this.populateBankTable(data.Details01);
      }

      // Initialize summary fields to zero (will update when user selects items)
      if (this.glTrxAmountInput) {
        this.glTrxAmountInput.value = '0.00';
      }
      if (this.bankTrxAmountInput) {
        this.bankTrxAmountInput.value = '0.00';
      }
      if (this.differenceInput) {
        this.differenceInput.value = '0.00';
      }
    },

    calculateTotal: function(array, field) {
      if (!array || !Array.isArray(array)) return 0;
      return array.reduce((sum, item) => sum + (parseFloat(item[field]) || 0), 0);
    },

    populateGLTable: function(transactions) {
      if (!this.glTransactionTable) {
        console.error('[BankReconciliationManual] GL Transaction table not found');
        return;
      }

      if (!transactions || transactions.length === 0) {
        this.glTransactionTable.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 8px; border: none; color: #64748b; font-size: 0.8rem;">No records to display.</td></tr>';
        return;
      }

      console.log('[BankReconciliationManual] Populating GL table with', transactions.length, 'records');
      console.log('[BankReconciliationManual] First GL transaction:', transactions[0]);

      this.glTransactionTable.innerHTML = transactions.map((trx, index) => {
        // Use actual GL field names from API response
        const chequeID = trx.ChequeID !== undefined && trx.ChequeID !== null ? trx.ChequeID : '';
        const date = ''; // GL response doesn't include transaction date, only ClearDate
        const clearDate = trx.ClearDate || '';
        const transactionType = trx.TrxType || '';
        const localAmount = trx.LocalAmount !== undefined && trx.LocalAmount !== null ? trx.LocalAmount : 0;
        const referenceNo = trx.ReferenceNo || '';
        const description = trx.TrxDescription || '';
        
        if (index === 0) {
          console.log('[BankReconciliationManual] GL Sample - ChequeID:', chequeID, 'ClearDate:', clearDate, 'Description:', description, 'LocalAmount:', localAmount);
        }
        
        return `
          <tr>
            <td style="padding: 8px; border: none;"><input type="checkbox" data-table="gl" data-index="${index}" disabled /></td>
            <td style="padding: 8px; border: none;">${chequeID}</td>
            <td style="padding: 8px; border: none;">${date}</td>
            <td style="padding: 8px; border: none;">${clearDate ? String(clearDate).split('T')[0] : ''}</td>
            <td style="padding: 8px; border: none;">${transactionType}</td>
            <td style="padding: 8px; border: none; text-align: right;">${localAmount}</td>
            <td style="padding: 8px; border: none;">${referenceNo}</td>
            <td style="padding: 8px; border: none;">${description}</td>
          </tr>
        `;
      }).join('');
      
      console.log('[BankReconciliationManual] GL table populated successfully');
      
      // Add event listeners to checkboxes for real-time total updates
      this.attachCheckboxListeners();
    },

    populateBankTable: function(transactions) {
      if (!this.bankTransactionTable) {
        console.error('[BankReconciliationManual] Bank Transaction table not found');
        return;
      }

      if (!transactions || transactions.length === 0) {
        this.bankTransactionTable.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 8px; border: none; color: #64748b; font-size: 0.8rem;">No records to display.</td></tr>';
        return;
      }

      console.log('[BankReconciliationManual] Populating Bank table with', transactions.length, 'records');
      console.log('[BankReconciliationManual] First Bank record:', transactions[0]);
      console.log('[BankReconciliationManual] Bank record keys:', Object.keys(transactions[0]));

      this.bankTransactionTable.innerHTML = transactions.map((trx, index) => {
        if (index === 0) console.log('[BankReconciliationManual] Bank available fields:', Object.keys(trx));
        
        const chequeID = trx.ChequeID !== undefined && trx.ChequeID !== null ? trx.ChequeID : '';
        const transaction = trx.TrxDate || trx.TransactionDate || trx.Date || '';
        const transactionType = trx.TrxType || trx.TransactionType || trx.Type || '';
        const transactionAmount = trx.TrxAmount !== undefined && trx.TrxAmount !== null ? trx.TrxAmount : (trx.TransactionAmount !== undefined && trx.TransactionAmount !== null ? trx.TransactionAmount : 0);
        const referenceNo = trx.ReferenceNo || trx.RefNo || trx.Reference || trx.ReferenceNumber || '';
        const narration = trx.Narration || trx.Description || trx.Remarks || trx.Details || '';
        
        return `
          <tr>
            <td style="padding: 8px; border: none;"><input type="checkbox" data-table="bank" data-index="${index}" disabled /></td>
            <td style="padding: 8px; border: none;">${chequeID}</td>
            <td style="padding: 8px; border: none;">${transaction ? (String(transaction).includes('T') ? String(transaction).split('T')[0] : transaction) : ''}</td>
            <td style="padding: 8px; border: none;">${transactionType}</td>
            <td style="padding: 8px; border: none; text-align: right;">${transactionAmount}</td>
            <td style="padding: 8px; border: none;">${referenceNo}</td>
            <td style="padding: 8px; border: none;">${narration}</td>
          </tr>
        `;
      }).join('');
      
      console.log('[BankReconciliationManual] Bank table populated successfully');
      
      // Add event listeners to checkboxes for real-time total updates
      this.attachCheckboxListeners();
    },

    handleEdit: function() {
      console.log('[BankReconciliationManual] Edit button clicked');
      
      if (!this.state.glTransactions.length && !this.state.bankTransactions.length) {
        alert('Please load data first using the View button');
        return;
      }
      
      // Enable edit mode
      this.state.isEditMode = true;
      this.state.isReconciling = false; // Reset reconciling flag
      
      // Enable all checkboxes
      this.setCheckboxStates(true);
      
      // Enable reconcile button
      if (this.reconcileBtn) {
        this.reconcileBtn.forEach(btn => btn.disabled = false);
      }
      
      // Disable edit button to prevent multiple clicks
      if (this.editBtn) this.editBtn.disabled = true;
      
      console.log('[BankReconciliationManual] Edit mode activated - Checkboxes enabled in both GL and Bank tables');
    },

    handleReconcile: function() {
      console.log('[BankReconciliationManual] Reconcile button clicked');
      
      // Prevent multiple reconcile operations
      if (this.state.isReconciling) {
        console.log('[BankReconciliationManual] Reconciliation already in progress, ignoring duplicate click');
        return;
      }
      
      if (!this.state.isEditMode) {
        alert('Please click Edit button first');
        return;
      }
      
      // Mark as reconciling
      this.state.isReconciling = true;
      
      // Get checked items from GL table
      const glCheckboxes = document.querySelectorAll('input[type="checkbox"][data-table="gl"]:checked');
      const glSelected = Array.from(glCheckboxes).map(cb => parseInt(cb.dataset.index));
      
      // Get checked items from Bank table
      const bankCheckboxes = document.querySelectorAll('input[type="checkbox"][data-table="bank"]:checked');
      const bankSelected = Array.from(bankCheckboxes).map(cb => parseInt(cb.dataset.index));
      
      if (glSelected.length === 0 && bankSelected.length === 0) {
        this.state.isReconciling = false;
        alert('Please select at least one transaction to reconcile');
        return;
      }
      
      console.log('[BankReconciliationManual] GL items selected:', glSelected);
      console.log('[BankReconciliationManual] Bank items selected:', bankSelected);
      
      // Store reconciled items
      this.state.reconciledItems = {
        gl: glSelected.map(index => this.state.glTransactions[index]),
        bank: bankSelected.map(index => this.state.bankTransactions[index]),
        glIndices: glSelected,
        bankIndices: bankSelected
      };
      
      // Disable checkboxes after reconciliation
      this.setCheckboxStates(false);
      
      // Disable reconcile button
      if (this.reconcileBtn) {
        this.reconcileBtn.forEach(btn => btn.disabled = true);
      }
      
      // Enable save button
      if (this.saveBtn) this.saveBtn.disabled = false;
      
      const totalSelected = glSelected.length + bankSelected.length;
      console.log('[BankReconciliationManual] Reconciliation completed');
      
      // Show success alert
      this.showSuccessAlert(`Transaction reconciled successfully! (${glSelected.length} GL items, ${bankSelected.length} Bank items)`);
      
      // Reset reconciling flag
      this.state.isReconciling = false;
    },

    handleSave: async function() {
      console.log('[BankReconciliationManual] Save button clicked');
      
      // Prevent duplicate save operations
      if (this.state.isSaving) {
        console.log('[BankReconciliationManual] Save already in progress, ignoring duplicate click');
        return;
      }
      
      if (!this.state.reconciledItems || 
          (this.state.reconciledItems.gl.length === 0 && this.state.reconciledItems.bank.length === 0)) {
        alert('No reconciled items to save');
        return;
      }
      
      // Check if data is stale (loaded more than 5 minutes ago)
      if (this.state.dataLoadedAt) {
        const minutesSinceLoad = (new Date() - this.state.dataLoadedAt) / (1000 * 60);
        if (minutesSinceLoad > 5) {
          const proceed = confirm(`Warning: Data was loaded ${Math.floor(minutesSinceLoad)} minutes ago.\\nIt may have been modified by another user.\\n\\nContinue saving anyway?`);
          if (!proceed) {
            return;
          }
        }
      }
      
      try {
        // Prepare bank statement details
        const bankStmtDetail = this.state.reconciledItems.bank.map(trx => ({
          ChequeID: trx.ChequeID || '',
          TrxDate: trx.TrxDate || trx.TransactionDate || '',
          TrxType: trx.TrxType || trx.TransactionType || '',
          TrxAmount: trx.TrxAmount || trx.TransactionAmount || 0,
          ReferenceNo: trx.ReferenceNo || trx.RefNo || '',
          Narration: trx.Narration || trx.Description || ''
        }));
        
        // Prepare account transaction details
        const accountTrxDetail = this.state.reconciledItems.gl.map(trx => ({
          ChequeID: trx.ChequeID || '',
          ClearDate: trx.ClearDate || '',
          TrxType: trx.TrxType || '',
          LocalAmount: trx.LocalAmount || 0,
          ReferenceNo: trx.ReferenceNo || '',
          TrxDescription: trx.TrxDescription || ''
        }));
        
        const requestData = {
          BankID: '00',
          OurBranchID: this.state.branchId,
          AccountID: this.state.glAccountId,
          BatchNo: this.state.batchNo,
          BankStmtDetail: JSON.stringify(bankStmtDetail),
          AccountTrxDetail: JSON.stringify(accountTrxDetail)
        };
        
        console.log('[BankReconciliationManual] Saving reconciliation with data:');
        console.log('  Branch ID:', this.state.branchId);
        console.log('  GL Account ID:', this.state.glAccountId);
        console.log('  Batch No:', this.state.batchNo);
        console.log('  GL Items:', this.state.reconciledItems.gl.length);
        console.log('  Bank Items:', this.state.reconciledItems.bank.length);
        console.log('  Full Request:', requestData);
        
        const result = await OtherModuleService.addBankReconManual(requestData);
        
        // Check if it's the "already edited" error - treat as success since we allow multiple edits
        const isAlreadyEditedError = result && !result.success && 
                                      result.message && 
                                      result.message.includes('Edit already done by another User');
        
        if ((result && result.success) || isAlreadyEditedError) {
          if (isAlreadyEditedError) {
            console.log('[BankReconciliationManual] Batch already edited - proceeding anyway (multiple edits allowed)');
          } else {
            console.log('[BankReconciliationManual] Save successful:', result);
          }
          
          // Reset saving flag
          this.state.isSaving = false;
          
          // Show success alert
          this.showSuccessAlert('Bank reconciliation data saved successfully!');
          
          // Show print preview BEFORE resetting state
          this.showPrintPreview();
          
          // Reset state AFTER print preview
          this.state.isEditMode = false;
          this.state.reconciledItems = [];
          
          // Disable save button
          if (this.saveBtn) this.saveBtn.disabled = true;
          
          // Disable reconcile buttons
          if (this.reconcileBtn) {
            this.reconcileBtn.forEach(btn => btn.disabled = true);
          }
          
          // Keep edit button enabled to allow multiple edits
          if (this.editBtn) this.editBtn.disabled = false;
          
          // Disable checkboxes
          this.setCheckboxStates(false);
        } else {
          // Reset saving flag on error
          this.state.isSaving = false;
          
          const errorMessage = result?.message || 'Failed to save reconciliation';
          console.error('[BankReconciliationManual] Save failed:', errorMessage);
          console.error('[BankReconciliationManual] Full response:', result);
          
          // Show error but don't prevent re-saving
          alert('Error: ' + errorMessage);
          if (this.saveBtn) this.saveBtn.disabled = false;
        }
      } catch (error) {
        // Reset saving flag on exception
        this.state.isSaving = false;
        if (this.saveBtn) this.saveBtn.disabled = false;
        
        console.error('[BankReconciliationManual] Exception during save:', error);
        console.error('[BankReconciliationManual] Error stack:', error.stack);
        
        // Extract meaningful error message
        let errorMsg = 'Unknown error occurred';
        if (error.message) {
          errorMsg = error.message;
        } else if (typeof error === 'string') {
          errorMsg = error;
        } else if (error.toString) {
          errorMsg = error.toString();
        }
        
        alert('Error saving reconciliation: ' + errorMsg);
      }
    },

    handleCancel: function() {
      console.log('[BankReconciliationManual] Cancel button clicked');
      
      if (confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
        // Reset state
        this.state.isEditMode = false;
        this.state.reconciledItems = [];
        
        // Disable checkboxes
        this.setCheckboxStates(false);
        
        // Reset button states
        if (this.saveBtn) this.saveBtn.disabled = true;
        if (this.reconcileBtn) {
          this.reconcileBtn.forEach(btn => btn.disabled = true);
        }
        if (this.editBtn && this.state.glTransactions.length > 0) {
          this.editBtn.disabled = false;
        }
        
        console.log('[BankReconciliationManual] Operation cancelled');
      }
    },

    handleSearchBranch: function() {
      console.log('[BankReconciliationManual] Search Branch button clicked');
      // TODO: Integrate with branch search modal when available
    },

    handleSearchGLAccount: async function() {
      console.log('[BankReconciliationManual] ============ GL ACCOUNT SEARCH CLICKED ============');
      
      try {
        const branchId = this.branchIdInput?.value || '0101';
        
        console.log('[BankReconciliationManual] Searching GL Accounts for branch:', branchId);
        
        // Check if GLAccountSearchService is available
        if (!window.GLAccountSearchService) {
          console.error('[BankReconciliationManual] GLAccountSearchService not loaded');
          alert('GL Account search service is not available. Please refresh the page.');
          return;
        }
        
        // Use the GL Account Search Service
        const response = await window.GLAccountSearchService.searchGLAccounts({
          branchId: branchId,
          operatorId: 'CSADM'
        });
        
        console.log('[BankReconciliationManual] GL Account search response:', response);
        
        let glAccounts = [];
        
        if (response && response.success && response.data) {
          glAccounts = Array.isArray(response.data) ? response.data : [];
          console.log('[BankReconciliationManual] Found', glAccounts.length, 'GL Accounts');
        }
        
        // Show modal with results (or empty for manual entry)
        console.log('[BankReconciliationManual] Opening GL Account modal with', glAccounts.length, 'accounts');
        this.showGLAccountModal(glAccounts);
        
      } catch (error) {
        console.error('[BankReconciliationManual] Error fetching GL Accounts:', error);
        alert('Error loading GL Accounts. You can still enter GL Account ID manually.');
        this.showGLAccountModal([]);
      }
    },

    handleSearchBatch: async function() {
      console.log('[BankReconciliationManual] ============ BATCH SEARCH CLICKED ============');
      
      try {
        const branchId = this.branchIdInput?.value || '0101';
        const glAccountId = this.glAccountIdInput?.value || '';
        
        console.log('[BankReconciliationManual] Searching Batches for branch:', branchId, 'account:', glAccountId);
        
        // Check if BatchSearchService is available
        if (!window.BatchSearchService) {
          console.error('[BankReconciliationManual] BatchSearchService not loaded');
          alert('Batch search service is not available. Please refresh the page.');
          return;
        }
        
        // Use the Batch Search Service
        const response = await window.BatchSearchService.searchBatches({
          branchId: branchId,
          accountId: glAccountId,
          operatorId: 'CSADM'
        });
        
        console.log('[BankReconciliationManual] Batch search response:', response);
        
        let batches = [];
        
        if (response && response.success && response.data) {
          batches = Array.isArray(response.data) ? response.data : [];
          console.log('[BankReconciliationManual] Found', batches.length, 'Batches');
        }
        
        // Show modal with results (or empty for manual entry)
        console.log('[BankReconciliationManual] Opening Batch modal with', batches.length, 'batches');
        this.showBatchModal(batches);
        
      } catch (error) {
        console.error('[BankReconciliationManual] Error fetching Batches:', error);
        alert('Error loading Batches. You can still enter Batch Number manually.');
        this.showBatchModal([]);
      }
    },


    showGLAccountModal: function(glAccounts) {
      // Create modal overlay
      const modal = document.createElement('div');
      modal.className = 'brm-modal-overlay';
      modal.setAttribute('data-modal', 'gl-account');
      
      const modalContent = document.createElement('div');
      modalContent.className = 'brm-modal-content';
      
      modalContent.innerHTML = `
        <div class="brm-modal-header">
          <h3 class="brm-modal-title"><i class="bi bi-search" style="margin-right: 8px;"></i>Select GL Account</h3>
          <button class="brm-modal-close" onclick="this.closest('[data-modal]').remove()">&times;</button>
        </div>
        <div class="brm-modal-body">
          <div class="brm-modal-search">
            <input type="text" placeholder="${glAccounts.length > 0 ? 'Search GL Account...' : 'Enter GL Account ID...'}" data-search-input />
          </div>
          <div style="border: 1px solid #e5e7eb; border-radius: 4px; min-height: 200px; max-height: 400px; overflow-y: auto;">
            ${glAccounts.length > 0 ? `
              <table class="brm-modal-table">
                <thead>
                  <tr>
                    <th>Account ID</th>
                    <th>Account Name</th>
                    <th>Short Name</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody data-list-container>
                  ${glAccounts.map(acc => `
                    <tr data-item="${acc.GLAccountID || acc.AccountID || ''}">
                      <td style="font-weight: 600;">${acc.GLAccountID || acc.AccountID || ''}</td>
                      <td>${acc.AccountName || acc.Description || ''}</td>
                      <td>${acc.ShortName || ''}</td>
                      <td><button type="button" class="btn btn-sm btn-primary brm-select-btn" data-account-id="${acc.GLAccountID || acc.AccountID || ''}" style="cursor: pointer;">Select</button></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : `
              <div style="padding: 40px; text-align: center; color: #94a3b8;">
                <i class="bi bi-inbox" style="font-size: 48px; display: block; margin-bottom: 12px; opacity: 0.5;"></i>
                <p style="margin: 0; font-size: 14px;">No GL Accounts found</p>
                <p style="margin: 8px 0 0 0; font-size: 12px;">Type the GL Account ID above and click OK</p>
              </div>
            `}
          </div>
        </div>
        <div class="brm-modal-footer">
          ${glAccounts.length === 0 ? `
            <div class="brm-modal-manual-entry">
              <input type="text" placeholder="Enter GL Account ID manually..." data-manual-input />
            </div>
          ` : '<div></div>'}
          <div style="display: flex; gap: 8px;">
            ${glAccounts.length === 0 ? '<button class="brm-modal-button" data-ok-btn>OK</button>' : ''}
            <button class="brm-modal-button-secondary" onclick="this.closest(\'[data-modal]\').remove()">Cancel</button>
          </div>
        </div>
      `;
      
      modal.appendChild(modalContent);
      document.body.appendChild(modal);
      
      // Add search functionality
      const searchInput = modalContent.querySelector('[data-search-input]');
      const manualInput = modalContent.querySelector('[data-manual-input]');
      const listContainer = modalContent.querySelector('[data-list-container]');
      const okBtn = modalContent.querySelector('[data-ok-btn]');
      
      // Sync manual input with search input
      if (manualInput) {
        searchInput?.addEventListener('input', (e) => {
          manualInput.value = e.target.value;
        });
      }
      
      // Handle manual entry when no data available
      if (okBtn && glAccounts.length === 0) {
        okBtn.addEventListener('click', () => {
          const manualValue = (manualInput?.value || searchInput?.value || '').trim();
          if (manualValue) {
            if (this.glAccountIdInput) {
              this.glAccountIdInput.value = manualValue;
            }
            modal.remove();
            console.log('[BankReconciliationManual] GL Account manually entered:', manualValue);
          }
        });
        
        // Allow Enter key to submit
        const handleEnter = (e) => {
          if (e.key === 'Enter') {
            okBtn.click();
          }
        };
        searchInput?.addEventListener('keypress', handleEnter);
        manualInput?.addEventListener('keypress', handleEnter);
      }
      
      if (glAccounts.length > 0) {
        searchInput?.addEventListener('input', (e) => {
          const searchTerm = e.target.value.toLowerCase();
          const rows = tableBody.querySelectorAll('tr');
          rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
          });
        });
        
        // Add click handler for Select buttons using event delegation
        modal.addEventListener('click', (e) => {
          if (e.target && e.target.classList.contains('brm-select-btn')) {
            e.preventDefault();
            e.stopPropagation();
            
            const accountId = e.target.getAttribute('data-account-id');
            console.log('[BankReconciliationManual] Select button clicked for account:', accountId);
            
            const selectedAccount = glAccounts.find(acc => 
              (acc.GLAccountID || acc.AccountID) === accountId
            );
            console.log('[BankReconciliationManual] Found account:', selectedAccount);
            
            if (selectedAccount) {
              if (this.glAccountIdInput) {
                this.glAccountIdInput.value = selectedAccount.GLAccountID || selectedAccount.AccountID || '';
                console.log('[BankReconciliationManual] GL Account ID set to:', this.glAccountIdInput.value);
              } else {
                console.error('[BankReconciliationManual] glAccountIdInput element not found!');
              }
              
              // Close modal
              modal.remove();
              console.log('[BankReconciliationManual] Modal closed');
            } else {
              console.error('[BankReconciliationManual] Account not found for ID:', accountId);
            }
          }
        });
      }
      
      // Close on overlay click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
      });
    },
    
    showBatchModal: function(batches) {
      // Create modal overlay
      const modal = document.createElement('div');
      modal.className = 'brm-modal-overlay';
      modal.setAttribute('data-modal', 'batch');
      
      const modalContent = document.createElement('div');
      modalContent.className = 'brm-modal-content';
      
      modalContent.innerHTML = `
        <div class="brm-modal-header">
          <h3 class="brm-modal-title"><i class="bi bi-search" style="margin-right: 8px;"></i>Select Batch Number</h3>
          <button class="brm-modal-close" onclick="this.closest('[data-modal]').remove()">&times;</button>
        </div>
        <div class="brm-modal-body">
          <div class="brm-modal-search">
            <input type="text" placeholder="${batches.length > 0 ? 'Search Batch Number...' : 'Enter Batch Number...'}" data-search-input />
          </div>
          <div style="border: 1px solid #e5e7eb; border-radius: 4px; min-height: 200px; max-height: 400px; overflow-y: auto;">
            ${batches.length > 0 ? `
              <table class="brm-modal-table">
                <thead>
                  <tr>
                    <th>Batch No.</th>
                    <th>Description</th>
                    <th>Date Range</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody data-list-container>
                  ${batches.map(batch => {
                    const fromDate = batch.StatementFromDate ? new Date(batch.StatementFromDate).toLocaleDateString() : '';
                    const toDate = batch.StatementToDate ? new Date(batch.StatementToDate).toLocaleDateString() : '';
                    const dateRange = fromDate && toDate ? `${fromDate} - ${toDate}` : (batch.BatchDate || '');
                    return `
                      <tr data-item="${batch.BatchNo || batch.BatchNumber || ''}">
                        <td style="font-weight: 600;">${batch.BatchNo || batch.BatchNumber || ''}</td>
                        <td>${batch.Description || batch.GLName || ''}</td>
                        <td>${dateRange}</td>
                        <td><button type="button" class="btn btn-sm btn-primary brm-batch-select-btn" data-batch-no="${batch.BatchNo || batch.BatchNumber || ''}" style="cursor: pointer;">Select</button></td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            ` : `
              <div style="padding: 40px; text-align: center; color: #94a3b8;">
                <i class="bi bi-inbox" style="font-size: 48px; display: block; margin-bottom: 12px; opacity: 0.5;"></i>
                <p style="margin: 0; font-size: 14px;">No Batches found</p>
                <p style="margin: 8px 0 0 0; font-size: 12px;">Type the Batch Number above and click OK</p>
              </div>
            `}
          </div>
        </div>
        <div class="brm-modal-footer">
          ${batches.length === 0 ? `
            <div class="brm-modal-manual-entry">
              <input type="text" placeholder="Enter Batch Number manually..." data-manual-input />
            </div>
          ` : '<div></div>'}
          <div style="display: flex; gap: 8px;">
            ${batches.length === 0 ? '<button class="brm-modal-button" data-ok-btn>OK</button>' : ''}
            <button class="brm-modal-button-secondary" onclick="this.closest(\'[data-modal]\').remove()">Cancel</button>
          </div>
        </div>
      `;
      
      modal.appendChild(modalContent);
      document.body.appendChild(modal);
      
      // Add search functionality
      const searchInput = modalContent.querySelector('[data-search-input]');
      const manualInput = modalContent.querySelector('[data-manual-input]');
      const listContainer = modalContent.querySelector('[data-list-container]');
      const okBtn = modalContent.querySelector('[data-ok-btn]');
      
      // Sync manual input with search input
      if (manualInput) {
        searchInput?.addEventListener('input', (e) => {
          manualInput.value = e.target.value;
        });
      }
      
      // Handle manual entry when no data available
      if (okBtn && batches.length === 0) {
        okBtn.addEventListener('click', () => {
          const manualValue = (manualInput?.value || searchInput?.value || '').trim();
          if (manualValue) {
            if (this.batchNoInput) {
              this.batchNoInput.value = manualValue;
            }
            modal.remove();
            console.log('[BankReconciliationManual] Batch manually entered:', manualValue);
          }
        });
        
        // Allow Enter key to submit
        const handleEnter = (e) => {
          if (e.key === 'Enter') {
            okBtn.click();
          }
        };
        searchInput?.addEventListener('keypress', handleEnter);
        manualInput?.addEventListener('keypress', handleEnter);
      }
      
      if (batches.length > 0) {
        searchInput?.addEventListener('input', (e) => {
          const searchTerm = e.target.value.toLowerCase();
          const rows = listContainer.querySelectorAll('tr');
          rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
          });
        });
        
        // Add click handler for Select buttons using event delegation
        modal.addEventListener('click', (e) => {
          if (e.target && e.target.classList.contains('brm-batch-select-btn')) {
            e.preventDefault();
            e.stopPropagation();
            
            const batchNo = e.target.getAttribute('data-batch-no');
            console.log('[BankReconciliationManual] Batch Select button clicked for:', batchNo);
            
            const selectedBatch = batches.find(b => 
              (b.BatchNo || b.BatchNumber) === batchNo
            );
            console.log('[BankReconciliationManual] Found batch:', selectedBatch);
            
            if (selectedBatch) {
              if (this.batchNoInput) {
                this.batchNoInput.value = selectedBatch.BatchNo || selectedBatch.BatchNumber || '';
                console.log('[BankReconciliationManual] Batch No set to:', this.batchNoInput.value);
              } else {
                console.error('[BankReconciliationManual] batchNoInput element not found!');
              }
              
              // Close modal
              modal.remove();
              console.log('[BankReconciliationManual] Modal closed');
            } else {
              console.error('[BankReconciliationManual] Batch not found for No:', batchNo);
            }
          }
        });
      }
      
      // Close on overlay click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
      });
    },

    showPrintPreview: function() {
      console.log('[BankReconciliationManual] Showing print preview');
      
      if (!this.state.reconciledItems || 
          (this.state.reconciledItems.gl.length === 0 && this.state.reconciledItems.bank.length === 0)) {
        console.warn('[BankReconciliationManual] No reconciled items for preview');
        return;
      }
      
      // Generate print content
      const printContent = this.generatePrintContent();
      
      // Create a smaller preview window (not full screen)
      const previewWindow = window.open('', 'PrintPreview', 'width=900,height=700,left=100,top=50,resizable=yes,scrollbars=yes');
      
      if (!previewWindow) {
        alert('Please allow popups to view the print preview');
        return;
      }
      
      previewWindow.document.write(printContent);
      previewWindow.document.close();
      
      console.log('[BankReconciliationManual] Print preview window opened');
    },

    generatePrintContent: function() {
      const branchId = this.state.branchId;
      const glAccountId = this.state.glAccountId;
      const batchNo = this.state.batchNo;
      const printDate = new Date().toLocaleString();
      
      let printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Bank Reconciliation Manual - Preview</title>
          <style>
            @media print {
              @page { margin: 1cm; }
              .no-print { display: none; }
            }
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { text-align: center; color: #5b9fd9; font-size: 24px; }
            .header { margin-bottom: 20px; }
            .header p { margin: 5px 0; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { background-color: #5b9fd9; color: white; padding: 10px; text-align: left; font-size: 12px; }
            td { border: 1px solid #ddd; padding: 8px; font-size: 11px; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .section-title { background-color: #5b9fd9; color: white; padding: 8px; margin-top: 20px; font-weight: bold; }
            .summary { margin-top: 20px; font-weight: bold; }
            .button-bar {
              text-align: center;
              margin-top: 30px;
              padding: 20px 0;
            }
            .button-bar button {
              padding: 12px 32px;
              margin: 0 10px;
              font-size: 14px;
              font-weight: 600;
              border-radius: 6px;
              cursor: pointer;
              transition: all 0.2s ease;
              border: none;
            }
            .button-bar button:first-child {
              background: #4A90E2;
              color: white;
              border: 2px solid #4A90E2;
            }
            .button-bar button:first-child:hover {
              background: #3b7bc4;
              border-color: #3b7bc4;
              box-shadow: 0 4px 12px rgba(74, 144, 226, 0.3);
              transform: translateY(-2px);
            }
            .button-bar button:first-child:active {
              transform: translateY(0);
              box-shadow: 0 2px 4px rgba(74, 144, 226, 0.2);
            }
            .button-bar button:last-child {
              background: white;
              color: #6b7280;
              border: 2px solid #d1d5db;
            }
            .button-bar button:last-child:hover {
              background: #f9fafb;
              border-color: #9ca3af;
              box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
              transform: translateY(-1px);
            }
            .button-bar button:last-child:active {
              transform: translateY(0);
              box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
            }
          </style>
        </head>
        <body>
          <h1>Bank Reconciliation Manual</h1>
          <div class="header">
            <p><strong>Branch ID:</strong> ${branchId}</p>
            <p><strong>GL Account ID:</strong> ${glAccountId}</p>
            <p><strong>Batch No:</strong> ${batchNo}</p>
            <p><strong>Preview Date:</strong> ${printDate}</p>
          </div>
      `;
      
      // Add GL Transaction table if there are reconciled GL items
      if (this.state.reconciledItems.gl.length > 0) {
        printContent += `
          <div class="section-title">GL Transaction</div>
          <table>
            <thead>
              <tr>
                <th>Cheque ID</th>
                <th>Date</th>
                <th>Clear Date</th>
                <th>Transaction Type</th>
                <th>Local Amount</th>
                <th>Reference No.</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
        `;
        
        this.state.reconciledItems.gl.forEach(trx => {
          const clearDate = trx.ClearDate ? String(trx.ClearDate).split('T')[0] : '';
          printContent += `
            <tr>
              <td>${trx.ChequeID || ''}</td>
              <td></td>
              <td>${clearDate}</td>
              <td>${trx.TrxType || ''}</td>
              <td>${trx.LocalAmount || 0}</td>
              <td>${trx.ReferenceNo || ''}</td>
              <td>${trx.TrxDescription || ''}</td>
            </tr>
          `;
        });
        
        printContent += '</tbody></table>';
      }
      
      // Add Bank Transaction table if there are reconciled bank items
      if (this.state.reconciledItems.bank.length > 0) {
        printContent += `
          <div class="section-title">Bank Account Transaction</div>
          <table>
            <thead>
              <tr>
                <th>Cheque ID</th>
                <th>Transaction</th>
                <th>Transaction Type</th>
                <th>Transaction Amount</th>
                <th>Reference No.</th>
                <th>Narration</th>
              </tr>
            </thead>
            <tbody>
        `;
        
        this.state.reconciledItems.bank.forEach(trx => {
          const transaction = trx.TrxDate || trx.TransactionDate || '';
          const transDate = transaction ? (String(transaction).includes('T') ? String(transaction).split('T')[0] : transaction) : '';
          printContent += `
            <tr>
              <td>${trx.ChequeID || ''}</td>
              <td>${transDate}</td>
              <td>${trx.TrxType || trx.TransactionType || ''}</td>
              <td>${trx.TrxAmount || trx.TransactionAmount || 0}</td>
              <td>${trx.ReferenceNo || trx.RefNo || ''}</td>
              <td>${trx.Narration || trx.Description || ''}</td>
            </tr>
          `;
        });
        
        printContent += '</tbody></table>';
      }
      
      // Add summary
      const glTotal = this.calculateTotal(this.state.reconciledItems.gl, 'LocalAmount');
      const bankTotal = this.calculateTotal(this.state.reconciledItems.bank, 'TrxAmount') || 
                        this.calculateTotal(this.state.reconciledItems.bank, 'TransactionAmount');
      const difference = glTotal - bankTotal;
      
      printContent += `
          <div class="summary">
            <p>GL Account Transaction Amount: ${glTotal.toFixed(2)}</p>
            <p>Bank Account Transaction Amount: ${bankTotal.toFixed(2)}</p>
            <p>Difference: ${difference.toFixed(2)}</p>
          </div>
          <div class="button-bar no-print">
            <button onclick="window.print()">Print</button>
            <button onclick="window.close()">Cancel</button>
          </div>
        </body>
        </html>
      `;
      
      return printContent;
    },

    // Test function to verify module functionality
    runTests: function() {
      console.log('[BankReconciliationManual] Running tests...');
      
      const tests = [
        {
          name: 'Elements Cached',
          test: () => {
            return this.branchIdInput && this.viewBtn && this.editBtn && 
                   this.saveBtn && this.reconcileBtn && this.glTransactionTable && 
                   this.bankTransactionTable;
          }
        },
        {
          name: 'Initial Button States',
          test: () => {
            return this.saveBtn.disabled === true && this.editBtn.disabled === true;
          }
        },
        {
          name: 'Services Loaded',
          test: () => {
            return window.CoreApi && window.OtherModuleService;
          }
        },
        {
          name: 'State Initialized',
          test: () => {
            return this.state && this.state.isEditMode === false;
          }
        }
      ];
      
      const results = tests.map(({ name, test }) => {
        const passed = test();
        console.log(`[Test] ${name}: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
        return { name, passed };
      });
      
      const allPassed = results.every(r => r.passed);
      console.log(`[BankReconciliationManual] Test Summary: ${results.filter(r => r.passed).length}/${results.length} passed`);
      
      return { results, allPassed };
    }
  };

  // Initialize on document ready
  console.log('========================================');
  console.log('Bank Reconciliation Manual - Script Loaded');
  console.log('Document ready state:', document.readyState);
  console.log('========================================');
  
  if (document.readyState === 'loading') {
    console.log('Waiting for DOMContentLoaded...');
    document.addEventListener('DOMContentLoaded', function() {
      console.log('DOMContentLoaded event fired, initializing...');
      bankReconciliationManual.init().then(() => {
        // Run tests after initialization
        setTimeout(() => {
          const testResults = bankReconciliationManual.runTests();
          if (testResults.allPassed) {
            console.log('✅ All initialization tests passed!');
          } else {
            console.warn('⚠️ Some initialization tests failed!');
          }
        }, 500);
      });
    });
  } else {
    console.log('Document already loaded, initializing now...');
    bankReconciliationManual.init().then(() => {
      // Run tests after initialization
      setTimeout(() => {
        const testResults = bankReconciliationManual.runTests();
        if (testResults.allPassed) {
          console.log('✅ All initialization tests passed!');
        } else {
          console.warn('⚠️ Some initialization tests failed!');
        }
      }, 500);
    });
  }

  // Expose to global scope if needed
  window.BankReconciliationManual = bankReconciliationManual;
})();
