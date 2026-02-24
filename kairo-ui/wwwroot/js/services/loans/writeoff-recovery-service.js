(function (global) {
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};
  const SearchService = global.SearchService;
  const BASE_URL = (Environment.baseUrlLoans || Environment.baseUrlCommon || "http://localhost:XXXX").replace(/\/+$/, "");
  const ENDPOINT = `${BASE_URL}/api/OldAPI`;

  class WriteOffRecoveryService {
    constructor() {
      this.moduleID = "4320"; // WriteOff Recovery
      this.dynamicValues = {};
    }

    setDynamicValue(key, value) {
      this.dynamicValues[key] = value;
    }

    getDynamicValue(key) {
      return this.dynamicValues[key] || null;
    }

    getOperatorId() {
      if (global.AuthService && global.AuthService.getSession) {
        const session = global.AuthService.getSession();
        return session?.operatorID || session?.operatorId || "web_portal";
      }
      return "web_portal";
    }

    getOurBranchId() {
      return this.getDynamicValue("BranchID") || "";
    }

    async fetchWriteOffDetails(context = {}) {
      const payload = {
        OurBranchID: context.branchId || this.getOurBranchId(),
        AccountID: context.accountId || "",
        LoanSeries: context.loanSeries || 0
      };

      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetWriteOffDetails", payload);
      console.log("[WriteOffRecoveryService] fetchWriteOffDetails payload", payload);

      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(envelope)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const raw = await response.json();
      console.log("[WriteOffRecoveryService] fetchWriteOffDetails raw", raw);

      // Return the master write-off details data
      // Response structure will be mapped based on result set provided
      if (raw && Array.isArray(raw.Details)) {
        return raw.Details[0] || null;
      }
      if (raw && Array.isArray(raw.Details01)) {
        return raw.Details01[0] || null;
      }
      if (raw && raw.result) {
        return raw.result[0] || null;
      }
      return null;
    }

    async fetchRecoveryTransactions(context = {}) {
      const payload = {
        OurBranchID: context.branchId || this.getOurBranchId(),
        AccountID: context.accountId || "",
        LoanSeries: context.loanSeries || 0,
        OperatorID: this.getOperatorId()
      };

      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetLoanRecovery", payload);
      console.log("[WriteOffRecoveryService] fetchRecoveryTransactions payload", payload);

      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(envelope)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const raw = await response.json();
      console.log("[WriteOffRecoveryService] fetchRecoveryTransactions raw", raw);

      // Return Details02 which contains the recovery transaction rows
      if (raw && Array.isArray(raw.Details02)) {
        return raw.Details02;
      }
      return [];
    }

    async fetchTransactionDescriptions() {
      const payload = {
        BankID: "00"
      };

      const envelope = CoreApi.makeRequestEnvelope("dbo.pc_TrxDescriptions", payload);
      console.log("[WriteOffRecoveryService] fetchTransactionDescriptions payload", payload);

      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(envelope)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const raw = await response.json();
      console.log("[WriteOffRecoveryService] fetchTransactionDescriptions raw", raw);

      // Return Details which contains the transaction descriptions
      if (raw && Array.isArray(raw.Details)) {
        return raw.Details;
      }
      return [];
    }

    async saveRecoveryTransaction(payload) {
      // Sanitize all parameters to prevent NULL defaults - use empty strings for null/undefined
      const sanitizeString = (val) => {
        return (val === null || val === undefined || val === 'null' || val === 'undefined') ? '' : String(val).trim();
      };

      const sanitizeNumber = (val) => {
        const num = parseFloat(val);
        return isNaN(num) ? 0 : num;
      };

      // Build the payload structure for p_GenerateWriteoffTrx stored procedure
      const savePayload = {
        BankID: '00',
        OurBranchID: sanitizeString(payload.OurBranchID),
        AccountID: sanitizeString(payload.AccountID),
        LoanSeries: sanitizeNumber(payload.LoanSeries),
        TrxType: sanitizeString(payload.TransactionType),
        RecoveryAccountID: sanitizeString(payload.RecoveryAccountID),
        ReCoveredAmt: sanitizeNumber(payload.RecoveredAmount),
        RecoveryGL: sanitizeString(payload.RecoveryGL),
        CurrencyID: sanitizeString(payload.CurrencyID),
        OperatorID: sanitizeString(payload.OperatorID || this.getOperatorId())
      };

      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GenerateWriteoffTrx", savePayload);
      console.log("[WriteOffRecoveryService] saveRecoveryTransaction - Calling p_GenerateWriteoffTrx with sanitized payload:", savePayload);

      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(envelope)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const raw = await response.json();
      console.log("[WriteOffRecoveryService] saveRecoveryTransaction response:", raw);

      // Check if the procedure returned an error or success message
      if (raw && raw.error) {
        throw new Error(raw.error);
      }

      return { success: true, message: "Write-off transaction generated successfully" };
    }

    async performSearch(fieldName, searchPayload) {
      try {
        console.log('[WriteOffRecoveryService] Performing search for', fieldName, 'with payload:', searchPayload);
        
        if (!SearchService) {
          console.error('[WriteOffRecoveryService] SearchService not available');
          return [];
        }

        const result = await SearchService.search(searchPayload);
        console.log('[WriteOffRecoveryService] Search result for', fieldName, ':', result);
        
        return result?.Details || result?.result || [];
      } catch (error) {
        console.error('[WriteOffRecoveryService] Search error:', error);
        return [];
      }
    }

    selectSearchResult(fieldName, result) {
      console.log('[WriteOffRecoveryService] selectSearchResult called for', fieldName);
      console.log('[WriteOffRecoveryService] Result object:', result);
      console.log('[WriteOffRecoveryService] Result keys:', Object.keys(result || {}));
      
      if (!result) {
        console.error('[WriteOffRecoveryService] No result provided');
        return;
      }

      if (fieldName === 'RecoveryAccountID') {
        // Extract account ID - try multiple field name variations
        const accountID = String(result.AccountID || result.accountID || result.id || '');
        
        // Extract account name with multiple fallback options
        // Try: Description, AccountName, Name (in that order)
        const accountName = String(
          result.Description || 
          result.description || 
          result.AccountName || 
          result.accountName || 
          result.Name || 
          result.name || 
          ''
        );

        const trxAccountEl = document.getElementById('TrxAccountID');
        const trxAccountNameEl = document.getElementById('TrxAccountName');
        
        if (trxAccountEl) {
          trxAccountEl.value = accountID;
          trxAccountEl.dispatchEvent(new Event('change', { bubbles: true }));
          console.log('[WriteOffRecoveryService] Set TrxAccountID to:', accountID);
        }
        if (trxAccountNameEl) {
          trxAccountNameEl.value = accountName;
          trxAccountNameEl.dispatchEvent(new Event('change', { bubbles: true }));
          console.log('[WriteOffRecoveryService] Set TrxAccountName to:', accountName);
        }
      } else if (fieldName === 'RecoveryGL') {
        // Extract GL ID - try multiple field name variations
        const glID = String(result.GLInterfaceAccountID1 || result.GLID || result.glid || result.GLId || result.glId || result.id || '');
        
        // Extract GL name with multiple fallback options
        // Try: Narration (primary for GL), Description, GLName, Name (in that order)
        const glName = String(
          result.Narration || 
          result.narration || 
          result.Description || 
          result.description || 
          result.GLName || 
          result.glName || 
          result.Name || 
          result.name || 
          ''
        );

        const recoveryGLEl = document.getElementById('RecoveryGL');
        const recoveryGLNameEl = document.getElementById('RecoveryGLName');
        
        if (recoveryGLEl) {
          recoveryGLEl.value = glID;
          recoveryGLEl.dispatchEvent(new Event('change', { bubbles: true }));
          console.log('[WriteOffRecoveryService] Set RecoveryGL to:', glID);
        }
        if (recoveryGLNameEl) {
          recoveryGLNameEl.value = glName;
          recoveryGLNameEl.dispatchEvent(new Event('change', { bubbles: true }));
          console.log('[WriteOffRecoveryService] Set RecoveryGLName to:', glName);
        }
      }
    }

    displaySearchModal(fieldName, tableID, whereStmt, context = {}) {
      const branchId = context.branchId || this.getOurBranchId();
      const clientId = context.clientId || '';
      const operatorId = this.getOperatorId();

      console.log('[WriteOffRecoveryService] displaySearchModal called for', fieldName, 'tableID:', tableID);

      // Create SearchModal instance
      const SearchModal = global.SearchModal;
      if (!SearchModal) {
        console.error('[WriteOffRecoveryService] SearchModal class not available');
        alert('Search functionality is not available');
        return;
      }

      const modal = new SearchModal({
        prefix: 'lwrc-search',
        moduleID: this.moduleID,
        getOperatorId: () => operatorId,
        getOurBranchId: () => branchId
      });

      // Different search configurations based on field type
      if (fieldName === 'RecoveryAccountID') {
        const advFilterString = `OurBranchID='${branchId}' AND ClientID='${clientId}'`;
        
        // Wait for modal to be fully initialized before opening
        setTimeout(() => {
          modal.open({
            tableID: 'AccountID',
            whereStmt: whereStmt || '',
            advFilterString: advFilterString,
            searchFields: [
              { name: 'AccountID', label: 'Account ID', column: 'AccountID' },
              { name: 'Description', label: 'Account Name', column: 'Description' }
            ],
            onSelect: (record) => {
              console.log('[WriteOffRecoveryService] AccountID search result selected:', record);
              this.selectSearchResult(fieldName, record);
            }
          });
        }, 100);
      } else if (fieldName === 'RecoveryGL') {
        const advFilterString = `ProductID='BMGL'`;
        
        // Wait for modal to be fully initialized before opening
        setTimeout(() => {
          modal.open({
            tableID: 'WriteoffGL',
            whereStmt: whereStmt || '',
            advFilterString: advFilterString,
            searchFields: [
              { name: 'GLID', label: 'GL ID', column: 'GLInterfaceAccountID1' },
              { name: 'GLName', label: 'GL Name', column: 'Narration' }
            ],
            onSelect: (record) => {
              console.log('[WriteOffRecoveryService] RecoveryGL search result selected:', record);
              this.selectSearchResult(fieldName, record);
            }
          });
        }, 100);
      }
    }

    initializeLookupButtons() {
      // Attach event listeners to lookup buttons
      const trxAccountBtn = document.querySelector('button[data-lookup="trx-account"]');
      if (trxAccountBtn) {
        trxAccountBtn.addEventListener('click', (e) => {
          e.preventDefault();
          let branchId = '';
          let clientId = '';
          const parentDoc = window.parent?.document;
          if (parentDoc) {
            branchId = parentDoc.getElementById('BranchID')?.value?.trim?.() || '';
            clientId = parentDoc.getElementById('ClientID')?.value?.trim?.() || '';
          }
          const context = { branchId, clientId };
          window.WriteOffRecoveryService.displaySearchModal('RecoveryAccountID', 'AccountID', '', context);
        });
      }

      const recoveryGLBtn = document.querySelector('button[data-lookup="recovery-gl"]');
      if (recoveryGLBtn) {
        recoveryGLBtn.addEventListener('click', (e) => {
          e.preventDefault();
          let branchId = '';
          const parentDoc = window.parent?.document;
          if (parentDoc) {
            branchId = parentDoc.getElementById('BranchID')?.value?.trim?.() || '';
          }
          const context = { branchId };
          window.WriteOffRecoveryService.displaySearchModal('RecoveryGL', 'GLID', '', context);
        });
      }
    }
  }

  global.WriteOffRecoveryService = new WriteOffRecoveryService();
})(typeof window !== "undefined" ? window : this);
