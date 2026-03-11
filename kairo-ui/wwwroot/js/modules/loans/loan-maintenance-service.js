(function (global) {
  console.log('[LoanMaintenanceService] Script loading...');
  
  if (global.__LoanMaintenanceServiceLoaded) {
    console.warn("loan-maintenance-service.js already loaded; skipping duplicate execution.");
    return;
  }
  global.__LoanMaintenanceServiceLoaded = true;

  const LookupService = global.LookupService;
  const SearchService = global.SearchService;
  const CoreApi = global.CoreApi;

  console.log('[LoanMaintenanceService] Checking dependencies...');
  console.log('  - LookupService:', LookupService ? 'LOADED' : 'MISSING');
  console.log('  - SearchService:', SearchService ? 'LOADED' : 'MISSING');
  console.log('  - CoreApi:', CoreApi ? 'LOADED' : 'MISSING');

  if (!LookupService) {
    console.error("[LoanMaintenanceService] LookupService not loaded - service initialization aborted");
    return;
  }

  if (!SearchService) {
    console.error("[LoanMaintenanceService] SearchService not loaded - service initialization aborted");
    return;
  }

  /**
   * LoanMaintenanceService
   * Handles dropdowns and search operations for Loan Maintenance module
   * Module ID: 4300 (from START_MENU_HIERARCHY.txt)
   */
  class LoanMaintenanceService {
        /**
         * SEARCH: AccountID only (no ClientID)
         * Custom logic for searching by AccountID only, as per requirements
         * @param {string} branchID - Branch ID
         * @param {string} accountID - Account ID
         */
        async searchAccountsByAccountOnly(branchID, accountID) {
          this.setDynamicValue("BranchID", branchID);
          this.setDynamicValue("AccountID", accountID);
          // Build WHERE clause as per user requirement
          // Example: N' AccountID Like ''%1201405000008%'''
          let whereStmt = '';
          if (accountID) {
            const sanitized = String(accountID).replace(/'/g, "''");
            whereStmt = `AccountID Like '%${sanitized}%'`;
          }
          // AdvFilterString as per user requirement
          // Example: N'OurBranchID=''1201'''
          const advFilterString = `OurBranchID='${branchID}'`;
          // Call the modal with custom params
          this.displaySearchModal('AccountID', 'LoanID', whereStmt, advFilterString);
        }
    constructor() {
      this.moduleID = this.resolveModuleId();
      this.dynamicValues = {};
      this.searchModalElement = null;
      this.currentSearchField = null;
      this.eventType = "None";
      this.searchConfigHistory = [];  // Track all config changes for debugging
    }

    /**
     * Log and track config changes for debugging AccountID search bug
     */
    trackConfigChange(context, newConfig) {
      const entry = {
        timestamp: new Date().toISOString(),
        context: context,
        searchField: this.currentSearchField,
        config: JSON.parse(JSON.stringify(newConfig)), // Deep copy
        stackTrace: new Error().stack
      };
      
      this.searchConfigHistory.push(entry);
      if (this.searchConfigHistory.length > 50) {
        this.searchConfigHistory.shift(); // Keep last 50
      }
      
      console.log('%c[CONFIG_TRACKER]', 'background: #673AB7; color: white; font-weight: bold;', context);
      console.log('  TableID:', newConfig.tableID);
      console.log('  Field:', newConfig.fieldName);
      console.log('  History entries:', this.searchConfigHistory.length);
    }

    /**
     * Validate that AccountID search always has TableID=LoanID
     */
    validateSearchConfig() {
      if (!this.currentSearchConfig) return false;
      
      const isValid = !(
        this.currentSearchField === 'AccountID' && 
        this.currentSearchConfig.tableID !== 'LoanID'
      );
      
      if (!isValid) {
        console.error('%c[VALIDATION FAILED]', 'background: red; color: white; font-weight: bold;',
          'AccountID search has TableID:', this.currentSearchConfig.tableID, 
          'Expected: LoanID');
      }
      
      return isValid;
    }

    /**
     * Resolve ModuleID from START_MENU_HIERARCHY (fallback to 4300 if not found)
     * This mirrors Client Maintenance behavior of deriving module IDs from the hierarchy.
     * @returns {string}
     */
    resolveModuleId() {
      try {
        const hierarchy = global.StartMenuHierarchy || global.START_MENU_HIERARCHY;
        if (hierarchy && hierarchy.loanMaintenance?.moduleId) {
          return String(hierarchy.loanMaintenance.moduleId);
        }
        if (hierarchy && hierarchy.LoanMaintenance?.ModuleID) {
          return String(hierarchy.LoanMaintenance.ModuleID);
        }
      } catch (err) {
        console.warn('[LoanMaintenanceService] Could not resolve ModuleID from hierarchy:', err);
      }
      // Fallback to documented ID from START_MENU_HIERARCHY.txt
      return "4300";
    }

    setEventType(value) {
      this.eventType = value || "None";
    }

    getEventType() {
      return this.eventType || "None";
    }

    /**
     * Set the current search field being searched
     * @param {string} fieldName - Field name
     */
    setCurrentSearchField(fieldName) {
      this.currentSearchField = fieldName;
    }

    /**
     * Normalize search response to extract results array
     * @param {object} response - Search response from SearchService
     * @returns {Array} Array of results
     */
    normalizeSearchResults(response) {
      if (!response) {
        console.warn('[LoanMaintenanceService] normalizeSearchResults: response is null/undefined');
        return [];
      }
      
      console.log('[LoanMaintenanceService] normalizeSearchResults input:', response);
      
      // Try multiple possible locations for results array
      let results = response?.Details?.SearchResults 
        || response?.Details 
        || response?.data?.SearchResults 
        || response?.data 
        || response?.SearchResults 
        || response?.result?.ResultSets?.[0]
        || response?.result
        || [];
        
      // Ensure it's an array
      if (!Array.isArray(results)) {
        console.warn('[LoanMaintenanceService] Results not an array, attempting to convert:', results);
        results = results ? [results] : [];
      }
      
      console.log('[LoanMaintenanceService] normalizeSearchResults output:', results);
      return results;
    }

    /**
     * Initialize the search modal for displaying results
     */
    initializeSearchModal() {
      if (this.searchModalElement) return;

      const modal = document.createElement('div');
      modal.id = 'lm-search-modal';
      modal.className = 'lm-search-modal';
      modal.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border: 1px solid #ccc;
        border-radius: 4px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        z-index: 10000;
        max-width: 800px;
        width: 90%;
        max-height: 600px;
        display: none;
        flex-direction: column;
      `;

      modal.innerHTML = `
        <div style="padding: 8px 16px; border-bottom: 1px solid #ccc; background: linear-gradient(to bottom, #f5f5f5, #e5e5e5); display: flex; justify-content: space-between; align-items: center;">
          <h3 style="margin: 0; font-size: 14px; font-weight: 600; color: #333;" id="lm-search-modal-title">Search Results</h3>
          <button type="button" id="lm-search-modal-close" style="border: none; background: none; font-size: 18px; cursor: pointer; padding: 0; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; color: #666;">×</button>
        </div>
        <div style="padding: 16px; background: #f9f9f9; border-bottom: 1px solid #ddd;">
          <div id="lm-search-criteria" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 12px; margin-bottom: 12px;"></div>
          <div style="text-align: center;">
            <button type="button" id="lm-search-btn" style="padding: 6px 32px; background: #e0e0e0; border: 1px solid #999; border-radius: 3px; cursor: pointer; font-size: 13px; font-weight: 500;">Search</button>
          </div>
        </div>
        <div id="lm-search-modal-loading" style="padding: 20px; text-align: center; display: none;">
          <span>Loading results...</span>
        </div>
        <div id="lm-search-modal-results" style="overflow-y: auto; flex: 1; padding: 0;"></div>
        <div id="lm-search-modal-empty" style="padding: 20px; text-align: center; color: #666; display: none;">
          No results found
        </div>
        <div style="padding: 12px 16px; border-top: 1px solid #ccc; background: #f5f5f5; display: flex; justify-content: center;">
          <button type="button" id="lm-search-modal-ok" style="padding: 6px 24px; background: #e0e0e0; border: 1px solid #999; border-radius: 3px; cursor: pointer; font-size: 13px; font-weight: 500;">OK</button>
        </div>
      `;

      document.body.appendChild(modal);
      this.searchModalElement = modal;
      this.allResults = [];
      this.filteredResults = [];
      this.currentSearchConfig = null;

      // Close button
      document.getElementById('lm-search-modal-close').addEventListener('click', () => {
        this.closeSearchModal();
      });

      // OK button
      document.getElementById('lm-search-modal-ok').addEventListener('click', () => {
        this.closeSearchModal();
      });

      // Search button
      document.getElementById('lm-search-btn').addEventListener('click', () => {
        this.executeSearch();
      });

      // Close on background click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeSearchModal();
        }
      });
    }

    /**
     * Display search modal with results
     */
    displaySearchModal(fieldName, tableID, whereStmt = '', advFilterString = '') {
      console.log('%c========== DISPLAY SEARCH MODAL ==========', 'background: #9C27B0; color: white; font-size: 14px; font-weight: bold;');
      console.log('[LoanMaintenanceService] displaySearchModal called with:');
      console.log('  fieldName:', fieldName);
      console.log('  tableID:', tableID);
      console.log('  whereStmt:', whereStmt);
      console.log('  advFilterString:', advFilterString);
      console.log('%c=========================================', 'background: #9C27B0; color: white; font-size: 14px; font-weight: bold;');

      this.initializeSearchModal();
      this.currentSearchField = fieldName;
      
      // CRITICAL: Store configuration with protective flags to prevent accidental modification
      this.currentSearchConfig = {
        tableID: tableID,
        whereStmt: whereStmt,
        fieldName: fieldName,
        advFilterString: advFilterString,
        _originalTableID: tableID,  // Immutable backup reference
        _initialized: new Date().toISOString()
      };
      
      // Track this config change for debugging
      this.trackConfigChange('displaySearchModal', this.currentSearchConfig);
      
      console.log('%c[LoanMaintenanceService] currentSearchConfig INITIALIZED:', 'background: #FF9800; color: white; font-size: 13px; font-weight: bold;');
      console.log(JSON.stringify(this.currentSearchConfig, null, 2));
      console.log('[LoanMaintenanceService] Will render search criteria for TableID:', tableID, 'in renderSearchCriteria method');
      
      // keep dynamic context up to date
      this.setDynamicValue("BranchID", this.getOurBranchId());

      const modal = this.searchModalElement;

      if (!modal) {
        console.error('[LoanMaintenanceService] Search modal element not found after initialization');
        return;
      }

      const titleEl = document.getElementById('lm-search-modal-title');
      const criteriaDiv = document.getElementById('lm-search-criteria');
      const resultsDiv = document.getElementById('lm-search-modal-results');
      const emptyDiv = document.getElementById('lm-search-modal-empty');
      const loadingDiv = document.getElementById('lm-search-modal-loading');

      titleEl.textContent = `Search Results - ${tableID}`;
      loadingDiv.style.display = 'block';
      resultsDiv.innerHTML = '';
      emptyDiv.style.display = 'none';

      // Dynamically build search criteria inputs based on the search definition
      this.renderSearchCriteria(criteriaDiv, tableID);

      modal.style.display = 'flex';
      console.log('[LoanMaintenanceService] Search modal displayed');

      // Execute initial search immediately to populate results
      console.log('[LoanMaintenanceService] Executing initial search automatically...');
      setTimeout(() => {
        this.executeSearch();
      }, 100);
    }

    /**
     * Render search criteria inputs dynamically based on TableID
     */
    renderSearchCriteria(container, tableID) {
      console.log('[LoanMaintenanceService] renderSearchCriteria called with tableID:', tableID);
      
      // Define search fields for each TableID
      const searchFields = {
        'BranchID': [
          { name: 'BranchID', label: 'Branch ID', column: 'OurBranchID' },
          { name: 'BranchName', label: 'Branch Name', column: 'BranchName' }
        ],
        'ClientAccountID': [
          { name: 'ClientID', label: 'Client ID', column: 'ClientID' },
          { name: 'ClientName', label: 'Client Name', column: 'ClientName' }
        ],
        'LoanID': [
          { name: 'AccountID', label: 'Account ID', column: 'AccountID' },
          { name: 'LoanSeries', label: 'Loan Series', column: 'LoanSeries' },
          { name: 'FileNumber', label: 'File Number', column: 'FileNumber' }
        ],
        'LoanSeriesID': [
          { name: 'LoanSeriesID', label: 'Loan Series ID', column: 'LoanSeriesID' },
          { name: 'Description', label: 'Description', column: 'Description' }
        ],
        'RepaymentAccountID': [
          { name: 'AccountID', label: 'Account ID', column: 'AccountID' },
          { name: 'AccountName', label: 'Account Name', column: 'AccountName' }
        ],
        'ActiveOfficerID': [
          { name: 'OfficerID', label: 'Officer ID', column: 'OfficerID' },
          { name: 'OfficerName', label: 'Officer Name', column: 'OfficerName' }
        ],
        'FundID': [
          { name: 'FundID', label: 'Fund ID', column: 'FundID' },
          { name: 'FundName', label: 'Fund Name', column: 'FundName' }
        ]
      };

      const fields = searchFields[tableID];
      
      if (!fields) {
        console.warn('[LoanMaintenanceService] No search fields defined for TableID:', tableID);
        console.warn('[LoanMaintenanceService] Falling back to default fields');
      }
      
      const fieldsToUse = fields || [
        { name: 'ID', label: 'ID', column: 'ID' },
        { name: 'Name', label: 'Name', column: 'Name' }
      ];

      console.log('[LoanMaintenanceService] Rendering search criteria for', tableID, 'with fields:', fieldsToUse);

      container.innerHTML = fieldsToUse.map(field => `
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <label style="font-size: 12px; font-weight: 500; color: #555;">${field.label}</label>
          <div style="display: flex; gap: 8px;">
            <select data-search-mode="${field.name}" style="padding: 4px 8px; border: 1px solid #ccc; border-radius: 3px; font-size: 13px; flex: 0 0 80px;">
              <option value="Like">Like</option>
              <option value="Exact">Exact</option>
            </select>
            <input type="text" data-search-field="${field.name}" data-search-column="${field.column}" placeholder="Enter ${field.label}" style="flex: 1; padding: 4px 8px; border: 1px solid #ccc; border-radius: 3px; font-size: 13px;" />
          </div>
        </div>
      `).join('');
      
      console.log('[LoanMaintenanceService] Search criteria rendered successfully');
    }

    /**
     * Execute search with user-entered criteria
     */
    async executeSearch() {
      console.log('%c========================================', 'background: #ff6600; color: white; font-size: 14px; font-weight: bold;');
      console.log('%c[LoanMaintenanceService] executeSearch STARTED', 'background: #ff6600; color: white; font-size: 14px; font-weight: bold;');
      console.log('%c========================================', 'background: #ff6600; color: white; font-size: 14px; font-weight: bold;');
      
      if (!this.currentSearchConfig) {
        console.error('[LoanMaintenanceService] No search config found!');
        return;
      }

      console.log('[LoanMaintenanceService] Current search config:', JSON.stringify(this.currentSearchConfig, null, 2));
      console.log('[LoanMaintenanceService] Current search field:', this.currentSearchField);
      console.log('[LoanMaintenanceService] TableID from config:', this.currentSearchConfig.tableID);
      console.log('[LoanMaintenanceService] FieldName from config:', this.currentSearchConfig.fieldName);
      
      // VALIDATE config before proceeding
      const configValid = this.validateSearchConfig();
      if (!configValid) {
        console.error('%c[CRITICAL] Search config validation FAILED!', 'background: red; color: white; font-weight: bold;');
        console.error('AccountID search must use TableID=LoanID');
        return;  // Exit early - do not execute with wrong config
      }
      
      console.log('%c✓ Config validation passed', 'background: green; color: white; font-weight: bold;');
      
      // CRITICAL: Preserve the original tableID - do NOT allow it to change
      const ORIGINAL_TABLEID = this.currentSearchConfig._originalTableID || this.currentSearchConfig.tableID;
      
      // Verify TableID is correct for AccountID searches
      if (this.currentSearchField === 'AccountID') {
        if (ORIGINAL_TABLEID !== 'LoanID') {
          console.error('%c[LoanMaintenanceService] CRITICAL ERROR: AccountID search has wrong TableID!', 'background: red; color: white; font-size: 16px; font-weight: bold;');
          console.error('[LoanMaintenanceService] Expected TableID: LoanID, Got:', ORIGINAL_TABLEID);
          console.error('[LoanMaintenanceService] This indicates a configuration problem - aborting search');
          return;
        }
        console.log('%c[LoanMaintenanceService] ✓ AccountID search correctly configured with TableID=LoanID', 'background: green; color: white; font-size: 14px; font-weight: bold;');
      }

      const criteriaInputs = document.querySelectorAll('[data-search-field]');
      const filters = [];
      
      console.log('[LoanMaintenanceService] Processing', criteriaInputs.length, 'search criteria inputs');
      
      criteriaInputs.forEach(input => {
        const value = input.value?.trim();
        const fieldName = input.dataset.searchField;
        const column = input.dataset.searchColumn;
        
        console.log(`[LoanMaintenanceService] Field: ${fieldName}, Value: "${value}", Column: ${column}`);
        
        if (value) {
          const mode = document.querySelector(`[data-search-mode="${fieldName}"]`)?.value || 'Like';
          const sanitized = value.replace(/'/g, "''");
          
          if (mode === 'Exact') {
            filters.push(`${column} = '${sanitized}'`);
          } else {
            filters.push(`${column} LIKE '%${sanitized}%'`);
          }
          console.log(`[LoanMaintenanceService] ✓ Added filter: ${column} ${mode} '${sanitized}'`);
        }
      });

      // Combine base WHERE clause with user filters
      let whereStmt = this.currentSearchConfig.whereStmt || '';
      if (filters.length > 0) {
        const userFilter = filters.join(' AND ');
        whereStmt = whereStmt ? `${whereStmt} AND ${userFilter}` : userFilter;
      }

      console.log('[LoanMaintenanceService] Final WHERE statement:', whereStmt);

      const loadingDiv = document.getElementById('lm-search-modal-loading');
      const emptyDiv = document.getElementById('lm-search-modal-empty');
      
      loadingDiv.style.display = 'block';
      emptyDiv.style.display = 'none';

      try {
        const payload = {
          TableID: ORIGINAL_TABLEID,  // ALWAYS use the original TableID
          WhereStmt: whereStmt,
          PrevOrNext: '1',
          RefID: '',
          OperatorID: this.getOperatorId(),
          ModuleID: this.moduleID,
          OurBranchID: this.getOurBranchId()
        };
        // If advFilterString is set, add it to the payload (for custom AccountID-only search)
        if (this.currentSearchConfig.advFilterString) {
          payload.AdvFilterString = this.currentSearchConfig.advFilterString;
        }

        console.log('%c[LoanMaintenanceService] FINAL SEARCH PAYLOAD:', 'background: #4CAF50; color: white; font-size: 14px; font-weight: bold;');
        console.log(JSON.stringify(payload, null, 2));
        console.log('%c========================================', 'background: #4CAF50; color: white; font-size: 14px; font-weight: bold;');
        
        if (!SearchService) {
          throw new Error('SearchService is not loaded');
        }

        const result = await SearchService.search(payload);
        console.log('[LoanMaintenanceService] Search result:', result);
        
        const results = this.normalizeSearchResults(result);
        console.log('[LoanMaintenanceService] Normalized results:', results);
        
        loadingDiv.style.display = 'none';
        
        if (results.length > 0) {
          this.renderResultsTable(results);
          this.allResults = results;
          this.filteredResults = results;
        } else {
          emptyDiv.style.display = 'block';
          emptyDiv.textContent = 'No results found';
        }
      } catch (error) {
        console.error('[LoanMaintenanceService] Search failed:', error);
        loadingDiv.style.display = 'none';
        emptyDiv.style.display = 'block';
        emptyDiv.textContent = 'Search failed: ' + (error.message || 'Unknown error');
      }
    }

    /**
     * Render results as a table with dynamic columns
     */
    renderResultsTable(results) {
      const resultsDiv = document.getElementById('lm-search-modal-results');
      
      if (!results || results.length === 0) {
        resultsDiv.innerHTML = '';
        return;
      }

      // Get column names from first result
      const columns = Object.keys(results[0]);
      
      // Create table HTML
      let tableHTML = `
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background: linear-gradient(to bottom, #4a90e2, #357abd); color: white;">
              <th style="padding: 8px; text-align: center; border: 1px solid #2868ab; font-weight: 600; width: 40px;">#</th>
              ${columns.map(col => `<th style="padding: 8px; text-align: left; border: 1px solid #2868ab; font-weight: 600;">${col}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${results.map((result, index) => {
              const rowColor = index % 2 === 0 ? '#ffffff' : '#e8f4ff';
              return `
                <tr style="background: ${rowColor}; cursor: pointer; transition: background 0.2s;" 
                    class="lm-search-result-row"
                    data-row-index="${index}"
                    onmouseover="this.style.background='#d0e8ff'"
                    onmouseout="this.style.background='${rowColor}'"
                    onclick="window.LoanMaintenanceService.selectSearchResultByIndex(${index})">
                  <td style="padding: 6px 8px; text-align: center; border: 1px solid #ddd;">${index + 1}</td>
                  ${columns.map(col => {
                    const value = String(result[col] || '');
                    return `<td style="padding: 6px 8px; border: 1px solid #ddd;">${value}</td>`;
                  }).join('')}
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;

      resultsDiv.innerHTML = tableHTML;
    }

    /**
     * Select search result by index (from filtered results)
     */
    selectSearchResultByIndex(index) {
      const result = this.filteredResults[index];
      if (!result) return;
      
      this.selectSearchResult(result);
    }

    /**
     * Close search modal
     */
    closeSearchModal() {
      if (this.searchModalElement) {
        this.searchModalElement.style.display = 'none';
        this.currentSearchField = null;
      }
    }

    /**
     * Handle search result selection
     */
    selectSearchResult(result) {
      if (!this.currentSearchField || !result) return;

      // Field mapping: [searchField] -> { id: fieldId, idColumn: columnName, name: nameFieldId, nameColumn: columnName }
      const fieldMapping = {
        'BranchID': { 
          id: 'BranchID', idColumn: 'OurBranchID', 
          name: 'BranchName', nameColumn: 'BranchName' 
        },
        'ClientID': { 
          id: 'ClientID', idColumn: 'ClientID', 
          name: 'ClientName', nameColumn: 'ClientName' 
        },
        'AccountID': { 
          id: 'AccountID', idColumn: 'AccountID', 
          name: 'AccountName', nameColumn: 'AccountName' 
        },
        'LoanSeries': { 
          id: 'LoanSeries', idColumn: 'LoanSeries', 
          name: 'LoanRefNo', nameColumn: 'LoanRefNo' 
        },
        'RepaymentAccountID': { 
          id: 'RepaymentAccountID', idColumn: 'AccountID', 
          name: 'RepaymentAccountName', nameColumn: 'AccountName' 
        },
        'FundID': { 
          id: 'FundID', idColumn: 'FundID', 
          name: 'FundName', nameColumn: 'FundName' 
        },
        'LegalOfficer': { 
          id: 'LegalOfficer', idColumn: 'OfficerID', 
          name: 'LegalOfficerName', nameColumn: 'OfficerName' 
        },
        'CreditOfficer': { 
          id: 'CreditOfficer', idColumn: 'OfficerID', 
          name: 'CreditOfficerName', nameColumn: 'OfficerName' 
        }
      };

      const mapping = fieldMapping[this.currentSearchField];
      
      if (mapping) {
        // Extract values from result using column names, with sensible fallbacks
        const idValue = String(result[mapping.idColumn] || '');
        let nameValue = '';
        if (this.currentSearchField === 'ClientID') {
          nameValue = String(result.ClientName || result.Name || result[mapping.nameColumn] || '');
        } else if (this.currentSearchField === 'AccountID') {
          nameValue = String(result.AccountName || result.Name || result[mapping.nameColumn] || '');
        } else {
          nameValue = String(result[mapping.nameColumn] || '');
        }

        // Populate ID field
        const idElement = document.getElementById(mapping.id);
        if (idElement) {
          idElement.value = idValue;
          idElement.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // Populate Name field if it exists
        const nameElement = document.getElementById(mapping.name);
        if (nameElement) {
          nameElement.value = nameValue;
          nameElement.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // Additional bindings for specific fields
        if (this.currentSearchField === 'AccountID') {
          const loanSeriesEl = document.getElementById('LoanSeries');
          if (loanSeriesEl && (result.LoanSeries != null)) {
            loanSeriesEl.value = String(result.LoanSeries);
            loanSeriesEl.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }

        console.log(`[LoanMaintenanceService] Selected ${this.currentSearchField}: ID=${idValue}, Name=${nameValue}`);
      } else {
        // Fallback: populate the current field with first column value
        const keys = Object.keys(result);
        const value = String(result[keys[0]] || '');
        const fieldElement = document.getElementById(this.currentSearchField);
        if (fieldElement) {
          fieldElement.value = value;
          fieldElement.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        console.log(`[LoanMaintenanceService] Selected ${this.currentSearchField}: ${value}`);
      }

      this.closeSearchModal();
    }

    /**
     * Set dynamic values that change based on user input
     * @param {string} key - The key (e.g., 'BranchID', 'ClientID')
     * @param {string} value - The value
     */
    setDynamicValue(key, value) {
      this.dynamicValues[key] = value;
    }

    getDynamicValue(key) {
      return this.dynamicValues[key];
    }

    /**
     * Get the logged-in operator ID
     * @returns {string} Operator ID
     */
    getOperatorId() {
      try {
        const session = global.AuthService?.getSession?.();
        return session?.operatorId || session?.operatorID || session?.name || "web_portal";
      } catch (error) {
        console.warn("[LoanMaintenanceService] Could not retrieve operator ID:", error);
        return "web_portal";
      }
    }

    getOurBranchId() {
      const field = document.getElementById("BranchID");
      return field?.value?.trim?.() || this.getDynamicValue("BranchID") || "";
    }

    /**
     * Resolve placeholder values in SQL statements
     * @param {string} stmt - SQL statement with placeholders
     * @returns {string} Resolved statement
     */
    resolvePlaceholders(stmt) {
      if (!stmt) return "";
      let resolved = stmt;
      resolved = resolved.replace(/\$BranchID\$/g, this.getOurBranchId());
      resolved = resolved.replace(/\$ClientID\$/g, this.getDynamicValue("ClientID") || "");
      resolved = resolved.replace(/\$AccountID\$/g, this.getDynamicValue("AccountID") || "");
      resolved = resolved.replace(/\$CurrencyID\$/g, this.getDynamicValue("CurrencyID") || "");
      resolved = resolved.replace(/\$ContraBranchID\$/g, this.getDynamicValue("ContraBranchID") || "");
      return resolved;
    }

    /**
     * DROPDOWN: Loan Purpose (PurposeCodeID)
     * @returns {Promise<Array>} Array of { value, label }
     */
    async getLoanPurposeOptions() {
      try {
        return await LookupService.getSystemCodeOptions("PurposeCodeID");
      } catch (error) {
        console.error("[LoanMaintenanceService] Failed to load Loan Purpose options:", error);
        return [];
      }
    }

    /**
     * DROPDOWN: Repayment Method (RepaymentMethodID)
     * @returns {Promise<Array>} Array of { value, label }
     */
    async getRepaymentMethodOptions() {
      try {
        return await LookupService.getSystemCodeOptions("RepaymentMethodID");
      } catch (error) {
        console.error("[LoanMaintenanceService] Failed to load Repayment Method options:", error);
        return [];
      }
    }

    /**
     * DROPDOWN: Line Of Business (LineOfBusinessID)
     * @returns {Promise<Array>} Array of { value, label }
     */
    async getLineOfBusinessOptions() {
      try {
        return await LookupService.getSystemCodeOptions("LineOfBusinessID");
      } catch (error) {
        console.error("[LoanMaintenanceService] Failed to load Line Of Business options:", error);
        return [];
      }
    }

    /**
     * DROPDOWN: Health Code (HealthCodeID)
     * @returns {Promise<Array>} Array of { value, label }
     */
    async getHealthCodeOptions() {
      try {
        return await LookupService.getSystemCodeOptions("HealthCodeID");
      } catch (error) {
        console.error("[LoanMaintenanceService] Failed to load Health Code options:", error);
        return [];
      }
    }

    // /**
    //  * DROPDOWN: Legal Status (LegalStatusID)
    //  * @returns {Promise<Array>} Array of { value, label }
    //  */
    // async getLegalStatusOptions() {
    //   try {
    //     return await LookupService.getSystemCodeOptions("LegalStatusID");
    //   } catch (error) {
    //     console.error("[LoanMaintenanceService] Failed to load Legal Status options:", error);
    //     return [];
    //   }
    // }

    /**
     * SEARCH: BranchID
     * TableID: "BranchID"
     * WhereStmt: ""
     * @returns {Promise} Search result
     */
    async searchBranches() {
      console.log('[LoanMaintenanceService] searchBranches called');
      this.displaySearchModal('BranchID', 'BranchID', '');
    }

    /**
     * SEARCH: ClientID
     * TableID: "ClientAccountID"
     * WhereStmt: "ProductTypeID='LN' AND OurBranchID = $BranchID$"
     * @param {string} branchID - Branch ID for filtering
     * @returns {Promise} Search result
     */
    async searchClients(branchID) {
      this.setDynamicValue("BranchID", branchID);
      const whereStmt = this.resolvePlaceholders("ProductTypeID='LN' AND OurBranchID = '$BranchID$'");
      this.displaySearchModal('ClientID', 'ClientAccountID', whereStmt);
    }

    /**
     * SEARCH: AccountID
     * TableID: "LoanID"
     * WhereStmt: user's search criteria only
     * AdvFilterString: "OurBranchID = $BranchID$"
     * @param {string} branchID - Branch ID
     * @param {string} clientID - Client ID (optional)
     * @returns {Promise} Search result
     */
    async searchAccounts(branchID, clientID) {
      this.setDynamicValue("BranchID", branchID);
      this.setDynamicValue("ClientID", clientID);
      
      // Use AdvFilterString for OurBranchID filter, not WhereStmt
      const advFilterString = `OurBranchID='${branchID}'`;
      
      // WhereStmt will be built from user input in the modal
      const whereStmt = '';
      
      this.displaySearchModal('AccountID', 'LoanID', whereStmt, advFilterString);
    }

    /**
     * SEARCH: LoanSeries
     * TableID: "LoanSeriesID"
     * WhereStmt: "AccountID = $AccountID$ AND OurBranchID = $BranchID$"
     * @param {string} branchID - Branch ID
     * @param {string} accountID - Account ID
     * @returns {Promise} Search result
     */
    async searchLoanSeries(branchID, accountID) {
      this.setDynamicValue("BranchID", branchID);
      this.setDynamicValue("AccountID", accountID);
      const whereStmt = this.resolvePlaceholders("AccountID = '$AccountID$' AND OurBranchID = '$BranchID$'");
      this.displaySearchModal('LoanSeries', 'LoanSeriesID', whereStmt);
    }

    /**
     * SEARCH: MainRepaymentAccountID
     * TableID: "RepaymentAccountID"
     * WhereStmt: "ClientID = $ClientID$ AND ProductTypeID IN ('SB','CA')"
     * @param {string} clientID - Client ID
     * @returns {Promise} Search result
     */
    async searchRepaymentAccounts(clientID) {
      this.setDynamicValue("ClientID", clientID);
      const whereStmt = this.resolvePlaceholders("ClientID = '$ClientID$' AND ProductTypeID IN ('SB','CA')");
      // Bind directly to the RepaymentAccountID input (Main Repayment Account ID)
      this.displaySearchModal('RepaymentAccountID', 'RepaymentAccountID', whereStmt);
    }

    /**
     * SEARCH: LegalOfficer
     * TableID: "ActiveOfficerID"
     * WhereStmt: "BankID=dbo.f_GetBankID('$BranchID$') AND ReportingBranchID = '$BranchID$' AND OfficerTypeID='CO'"
     * @param {string} branchID - Branch ID
     * @returns {Promise} Search result
     */
    async searchLegalOfficers(branchID) {
      this.setDynamicValue("BranchID", branchID);
      const whereStmt = this.resolvePlaceholders(
        "BankID=dbo.f_GetBankID('$BranchID$') AND ReportingBranchID = '$BranchID$' AND OfficerTypeID='CO'"
      );
      this.displaySearchModal('LegalOfficer', 'ActiveOfficerID', whereStmt);
    }

    /**
     * SEARCH: FundID
     * TableID: "FundID"
     * WhereStmt: ""
     * @returns {Promise} Search result
     */
    async searchFunds() {
      this.displaySearchModal('FundID', 'FundID', '');
    }

    /**
     * Auto-lookup field when user enters a value and tabs away
     * @param {string} fieldName - The field name (e.g., 'BranchID', 'ClientID')
     * @param {string} value - The value entered by user
     */
    async autoLookupField(fieldName, value) {
      if (!value || !value.trim()) return;

      console.log(`[LoanMaintenanceService] Auto-lookup triggered for ${fieldName} with value: ${value}`);

      // Define search configurations for each field
      const searchConfigs = {
        'BranchID': { 
          tableID: 'BranchID', 
          whereStmt: '', 
          column: 'OurBranchID' 
        },
        'ClientID': { 
          tableID: 'ClientAccountID', 
          whereStmt: () => {
            const branchID = this.getOurBranchId();
            return branchID ? `ProductTypeID='LN' AND OurBranchID = '${branchID}'` : '';
          },
          column: 'ClientID' 
        },
        'AccountID': { 
          tableID: 'LoanID', 
          whereStmt: () => {
            const branchID = this.getOurBranchId();
            const clientID = this.getDynamicValue('ClientID') || document.getElementById('ClientID')?.value?.trim();
            return (branchID && clientID) ? `OurBranchID = '${branchID}' AND ClientID = '${clientID}'` : '';
          },
          column: 'AccountID' 
        },
        'LoanSeries': { 
          tableID: 'LoanSeriesID', 
          whereStmt: () => {
            const branchID = this.getOurBranchId();
            const accountID = document.getElementById('AccountID')?.value?.trim();
            return (branchID && accountID) ? `AccountID = '${accountID}' AND OurBranchID = '${branchID}'` : '';
          },
          column: 'LoanSeries' 
        },
        'RepaymentAccountID': { 
          tableID: 'RepaymentAccountID', 
          whereStmt: () => {
            const clientID = this.getDynamicValue('ClientID') || document.getElementById('ClientID')?.value?.trim();
            return clientID ? `ClientID = '${clientID}' AND ProductTypeID IN ('SB','CA')` : '';
          },
          column: 'AccountID' 
        },
        'FundID': { 
          tableID: 'FundID', 
          whereStmt: '', 
          column: 'FundID' 
        },
        'LegalOfficer': { 
          tableID: 'ActiveOfficerID', 
          whereStmt: () => {
            const branchID = this.getOurBranchId();
            return branchID ? `BankID=dbo.f_GetBankID('${branchID}') AND ReportingBranchID = '${branchID}' AND OfficerTypeID='CO'` : '';
          },
          column: 'OfficerID' 
        },
        'CreditOfficer': { 
          tableID: 'ActiveOfficerID', 
          whereStmt: () => {
            const branchID = this.getOurBranchId();
            return branchID ? `BankID=dbo.f_GetBankID('${branchID}') AND ReportingBranchID = '${branchID}' AND OfficerTypeID='CO'` : '';
          },
          column: 'OfficerID' 
        }
      };

      const config = searchConfigs[fieldName];
      if (!config) {
        console.warn(`[LoanMaintenanceService] No auto-lookup config for field: ${fieldName}`);
        return;
      }

      // Build WHERE clause
      let baseWhere = typeof config.whereStmt === 'function' ? config.whereStmt() : config.whereStmt;
      const sanitizedValue = value.replace(/'/g, "''");
      const valueFilter = `${config.column} LIKE '%${sanitizedValue}%'`;
      const whereStmt = baseWhere ? `${baseWhere} AND ${valueFilter}` : valueFilter;

      try {
        const payload = {
          TableID: config.tableID,
          WhereStmt: whereStmt,
          PrevOrNext: '1',
          RefID: '',
          OperatorID: this.getOperatorId(),
          ModuleID: this.moduleID,
          OurBranchID: this.getOurBranchId()
        };

        console.log(`[LoanMaintenanceService] Auto-lookup payload:`, payload);

        const result = await SearchService.search(payload);
        const results = this.normalizeSearchResults(result);

        console.log(`[LoanMaintenanceService] Auto-lookup results count: ${results.length}`);

        if (results.length === 1) {
          // Exactly one result - auto-fill
          console.log(`[LoanMaintenanceService] Single result found, auto-filling...`);
          this.currentSearchField = fieldName;
          this.selectSearchResult(results[0]);
        } else if (results.length > 1) {
          // Multiple results - show search modal
          console.log(`[LoanMaintenanceService] Multiple results found, showing search modal...`);
          this.currentSearchField = fieldName;
          this.currentSearchConfig = {
            tableID: config.tableID,
            whereStmt: baseWhere,
            fieldName: fieldName
          };
          this.filteredResults = results;
          this.allResults = results;
          
          this.initializeSearchModal();
          const modal = this.searchModalElement;
          modal.style.display = 'flex';
          
          const titleEl = document.getElementById('lm-search-modal-title');
          titleEl.textContent = `Search Results - ${fieldName}`;
          
          const loadingDiv = document.getElementById('lm-search-modal-loading');
          const emptyDiv = document.getElementById('lm-search-modal-empty');
          loadingDiv.style.display = 'none';
          emptyDiv.style.display = 'none';
          
          this.renderResultsTable(results);
        } else {
          // No results
          console.log(`[LoanMaintenanceService] No results found for auto-lookup`);
        }
      } catch (error) {
        console.error(`[LoanMaintenanceService] Auto-lookup failed:`, error);
      }
    }

    /**
     * Initialize all dropdowns on the page
     * Only loads dropdowns that exist in the DOM and have a mapping.
     * @returns {Promise<void>}
     */
    async initializeAllDropdowns() {
      try {
        console.log("[LoanMaintenanceService] Initializing all dropdowns...");

        // HealthCode is populated from Details03 in GetLoan response (not from lookup)
        const dropdownMap = {
          LoanPurpose: "PurposeCodeID",
          RepaymentMethod: "RepaymentMethodID",
          LineOfBusiness: "LineOfBusinessID",
          LegalStatus: "LegalStatusID"
        };

        const tasks = Object.entries(dropdownMap)
          .filter(([elementId]) => document.getElementById(elementId))
          .map(async ([elementId, systemCodeType]) => {
            const options = await LookupService.getSystemCodeOptions(systemCodeType);
            this.populateDropdown(elementId, options || []);
          });

        await Promise.all(tasks);
        console.log("[LoanMaintenanceService] Dropdowns initialized successfully");
      } catch (error) {
        console.error("[LoanMaintenanceService] Failed to initialize dropdowns:", error);
      }
    }

    /**
     * Populate a dropdown with options
     * @param {string} elementId - The ID of the select element
     * @param {Array} options - Array of { value, label } objects
     */
    populateDropdown(elementId, options = []) {
      const element = document.getElementById(elementId);
      if (!element) {
        console.warn(`[LoanMaintenanceService] Dropdown element not found: ${elementId}`);
        return;
      }

      // Always clear and add placeholder
      element.innerHTML = '';
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = '--Select--';
      element.appendChild(placeholder);

      // Add options
      options.forEach((opt) => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        element.appendChild(option);
      });

      // Set default selection: first DB value if present, else placeholder
      if (options.length > 0) {
        element.selectedIndex = 1;
      } else {
        element.selectedIndex = 0;
      }

      // If a value is already set and not in the list, fallback to placeholder
      if (element.value && !options.some(opt => opt.value === element.value)) {
        element.selectedIndex = 0;
      }

      console.log(`[LoanMaintenanceService] Populated ${elementId} with ${options.length} options:`, options.slice(0, 3));
    }
  }

  // Expose to global scope
  console.log('[LoanMaintenanceService] Creating service instance...');
  const serviceInstance = new LoanMaintenanceService();
  global.LoanMaintenanceService = serviceInstance;
  console.log("[LoanMaintenanceService] ✓ Service loaded and ready");
  console.log('[LoanMaintenanceService] Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(serviceInstance)).filter(m => m !== 'constructor'));
})(window);
