(function (global) {
  const Environment = global.Environment || {};
  const SearchService = global.SearchService;
  const LookupService = global.LookupService;
  const BASE_URL = (Environment.baseUrlLoans || Environment.baseUrlCommon || "http://localhost:XXXX").replace(/\/+$/, "");
  const ENDPOINT = `${BASE_URL}/api/OldAPI`;

  class InsuranceService {
    constructor() {
      this.moduleID = "4305"; // Insurance
      this.dynamicValues = {};
      this.coreApiReady = false;
      this.waitForCoreApi();
    }

    // Wait for CoreApi to be available (may be loaded from parent window or globally)
    waitForCoreApi(maxWaitMs = 5000, intervalMs = 100) {
      const start = Date.now();
      (async () => {
        const checkReady = () => {
          const CoreApi = global.CoreApi || (typeof window !== 'undefined' && window.CoreApi);
          if (CoreApi && typeof CoreApi.makeRequestEnvelope === 'function') {
            this.coreApiReady = true;
            console.log("[InsuranceService] CoreApi is ready");
            return true;
          }
          if (Date.now() - start < maxWaitMs) {
            setTimeout(checkReady, intervalMs);
          } else {
            console.warn("[InsuranceService] CoreApi not available after timeout, using fallback");
            this.coreApiReady = false;
          }
        };
        checkReady();
      })();
    }

    // Get CoreApi from global or window scope
    getCoreApi() {
      return global.CoreApi || (typeof window !== 'undefined' && window.CoreApi);
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

    /**
     * Fetch insurance records for an account/loan
     */
    async fetchInsuranceRecords(context = {}) {
      const payload = {
        OurBranchID: context.branchId || this.getOurBranchId(),
        AccountID: context.accountId || "",
        LoanSeries: context.loanSeries || 0
      };

      const CoreApi = this.getCoreApi();
      if (!CoreApi) throw new Error("CoreApi not available");
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetInsuranceDetails", payload);
      console.log("[InsuranceService] fetchInsuranceRecords payload", payload);

      try {
        const response = await fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(envelope)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const raw = await response.json();
        console.log("[InsuranceService] fetchInsuranceRecords response", raw);

        if (raw && Array.isArray(raw.Details)) {
          return raw.Details || [];
        }
        return [];
      } catch (error) {
        console.error("[InsuranceService] fetchInsuranceRecords error", error);
        throw error;
      }
    }

    /**
     * Fetch a single insurance record by policy number
     * Uses p_GetAccountInsurances for searching/fetching specific policy
     * Response structure: Details (metadata), Details01 (BTS), Details02 (policy record)
     */
    async fetchInsuranceByPolicyNo(context = {}) {
      const payload = {
        OurBranchID: context.branchId || this.getOurBranchId(),
        AccountID: context.accountId || this.getDynamicValue('AccountID') || "",
        LoanSeries: context.loanSeries || 0,
        PolicyNo: context.policyNo || "",
        OperatorID: this.getOperatorId(),
        Direction: context.direction || 0
      };

      const CoreApi = this.getCoreApi();
      if (!CoreApi) throw new Error("CoreApi not available");
      
      // Use p_GetAccountInsurances for consistent policy lookup
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetAccountInsurances", payload);
      console.log("[InsuranceService] fetchInsuranceByPolicyNo payload", payload);

      try {
        const response = await fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(envelope)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const raw = await response.json();
        console.log("[InsuranceService] fetchInsuranceByPolicyNo response", raw);

        // p_GetAccountInsurances returns:
        // Details - metadata (OperatorID, EventID, UpdateCount)
        // Details01 - BTS data (SanctionedAmount, TotalPolicyAmount)
        // Details02 - policy record data (PolicyNo, PolicyDate, InsuranceID, etc.)
        
        const metadata = (Array.isArray(raw.Details) && raw.Details[0]) || {};
        const btsData = (Array.isArray(raw.Details01) && raw.Details01[0]) || {};
        const policyData = (Array.isArray(raw.Details02) && raw.Details02[0]) || null;

        if (policyData) {
          // Merge all data together for easier access
          const record = {
            // From Details02 (policy record)
            OurBranchID: policyData.OurBranchID || '',
            AccountID: policyData.AccountID || '',
            LoanSeries: policyData.LoanSeries || 0,
            PolicyNo: policyData.PolicyNo || '',
            PolicyDate: policyData.PolicyDate || '',
            LifeInsuranceTypeID: policyData.LifeInsuranceTypeID || '',
            InsuranceID: policyData.InsuranceID || '',
            CompanyName: policyData.CompanyName || '',
            PolicyMaturityDate: policyData.PolicyMaturityDate || '',
            PolicyAmount: policyData.PoliCyAmount || policyData.PolicyAmount || 0,  // Note: typo in response "PoliCyAmount"
            PremiumAmount: policyData.PremiumAmount || 0,
            PremiumTypeID: policyData.PremiumTypeID || '',
            PremiumFrequencyID: policyData.PremiumFrequencyID || '',
            LastPremiumPaidDate: policyData.LastPremiumPaidDate || '',
            NextPremiumDueDate: policyData.NextPremiumDueDate || '',
            Remarks: policyData.Remarks || '',
            CreatedBy: policyData.CreatedBy || '',
            CreatedOn: policyData.CreatedOn || '',
            ModifiedBy: policyData.ModifiedBy || '',
            ModifiedOn: policyData.ModifiedOn || '',
            SupervisedBy: policyData.SupervisedBy || '',
            SupervisedOn: policyData.SupervisedOn || '',
            UpdateCount: policyData.UpdateCount || 0,
            
            // From Details01 (BTS data)
            SanctionedAmount: btsData.SanctionedAmount || 0,
            TotalPolicyAmount: btsData.TotalPolicyAmount || 0,
            
            // From Details (metadata)
            EventID: metadata.EventID || 0
          };

          // Extract nominees
          const nominees = [
            {
              name: policyData.Nominee1 || '',
              relation: policyData.RelationID1 || '',
              share: policyData.Share1 || 0
            },
            {
              name: policyData.Nominee2 || '',
              relation: policyData.RelationID2 || '',
              share: policyData.Share2 || 0
            },
            {
              name: policyData.Nominee3 || '',
              relation: policyData.RelationID3 || '',
              share: policyData.Share3 || 0
            }
          ];

          return {
            success: true,
            record: record,
            nominees: nominees,
            bts: btsData
          };
        }
        
        return { 
          success: false,
          record: null, 
          nominees: [], 
          bts: {} 
        };
      } catch (error) {
        console.error("[InsuranceService] fetchInsuranceByPolicyNo error", error);
        throw error;
      }
    }

    /**
     * Save insurance record (INSERT or UPDATE via p_AddEditAccountInsurances)
     * Handles NULL values by converting to empty strings or default values as per stored procedure
     */
    async saveInsuranceRecord(payload = {}) {
      const CoreApi = this.getCoreApi();
      if (!CoreApi) throw new Error("CoreApi not available");
      
      // Helper to convert NULL/undefined to empty string or appropriate default
      const sanitizeValue = (value, defaultValue = '') => {
        if (value === null || value === undefined || value === '') {
          return defaultValue;
        }
        return value;
      };
      
      // Map field names to match stored procedure parameter names
      const savePayload = {
        OurBranchID: sanitizeValue(payload.OurBranchID, this.getOurBranchId()),
        AccountID: sanitizeValue(payload.AccountID || this.getDynamicValue('AccountID')),
        LoanSeries: payload.LoanSeries || 0,
        PolicyNo: sanitizeValue(payload.PolicyNo),
        PolicyDate: sanitizeValue(payload.PolicyDate),
        InsuranceID: sanitizeValue(payload.InsuranceID || payload.CompanyID),
        LifeInsuranceTypeID: sanitizeValue(payload.LifeInsuranceTypeID || payload.InsuranceTypeID),
        PolicyAmount: payload.PolicyAmount || 0,
        PremiumAmount: payload.PremiumAmount || 0,
        PolicyMaturityDate: sanitizeValue(payload.PolicyMaturityDate || payload.MaturityDate),
        PremiumTypeID: sanitizeValue(payload.PremiumTypeID || payload.PremiumType),
        PremiumFrequencyID: sanitizeValue(payload.PremiumFrequencyID || payload.PremiumFrequency),
        LastPremiumPaidDate: sanitizeValue(payload.LastPremiumPaidDate),
        NextPremiumDueDate: sanitizeValue(payload.NextPremiumDueDate || payload.NextPremiumDate),
        Nominee1: sanitizeValue(payload.Nominee1 || payload.nominee1),
        RelationID1: sanitizeValue(payload.RelationID1 || payload.nominee1Relation),
        Share1: payload.Share1 ? parseFloat(payload.Share1) : '',
        Nominee2: sanitizeValue(payload.Nominee2 || payload.nominee2),
        RelationID2: sanitizeValue(payload.RelationID2 || payload.nominee2Relation),
        Share2: payload.Share2 ? parseFloat(payload.Share2) : '',
        Nominee3: sanitizeValue(payload.Nominee3 || payload.nominee3),
        RelationID3: sanitizeValue(payload.RelationID3 || payload.nominee3Relation),
        Share3: payload.Share3 ? parseFloat(payload.Share3) : '',
        Remarks: sanitizeValue(payload.Remarks),
        CreatedBy: sanitizeValue(payload.CreatedBy || this.getOperatorId()),
        CreatedOn: sanitizeValue(payload.CreatedOn),
        ModifiedBy: sanitizeValue(payload.ModifiedBy),
        ModifiedOn: sanitizeValue(payload.ModifiedOn),
        SupervisedBY: sanitizeValue(payload.SupervisedBY),
        NewRecord: payload.NewRecord !== undefined ? payload.NewRecord : 1
      };
      
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_AddEditAccountInsurances", savePayload);
      console.log("[InsuranceService] saveInsuranceRecord payload", savePayload);

      try {
        const response = await fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(envelope)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const raw = await response.json();
        console.log("[InsuranceService] saveInsuranceRecord response", raw);

        // Treat any 200 response as success, including empty Details array
        // Format 1: { Details: [{ bResponse: true, UpdateCount: X, ... }] }
        if (raw && raw.Details && Array.isArray(raw.Details)) {
          if (raw.Details.length === 0) {
            // Empty Details array is a valid success
            return { success: true, data: raw };
          }
          const result = raw.Details[0];
          if (result.bResponse === true) {
            return { success: true, data: result };
          } else {
            return { success: false, error: result.ErrorMsg || result.error || "Save failed" };
          }
        }
        // Format 2: { bResponse: true, UpdateCount: X, ... } (direct response)
        if (raw && raw.bResponse === true) {
          return { success: true, data: raw };
        }
        // Format 3: { success: true } (normalized format)
        if (raw && raw.success === true) {
          return { success: true, data: raw };
        }
        // If we get here, but we got a 200 response, treat as success
        return { success: true, data: raw };
      } catch (error) {
        console.error("[InsuranceService] saveInsuranceRecord error", error);
        throw error;
      }
    }

    /**
     * Delete insurance record using p_DeleteAccountInsurances
     */
    async deleteInsuranceRecord(context = {}) {
      const payload = {
        OurBranchID: context.branchId || this.getOurBranchId(),
        AccountID: context.accountId || this.getDynamicValue('AccountID') || "",
        LoanSeries: context.loanSeries || 0,
        PolicyNo: context.policyNo || "",
        NewRecord: context.updateCount !== undefined ? context.updateCount : 0
      };

      const CoreApi = this.getCoreApi();
      if (!CoreApi) throw new Error("CoreApi not available");
      
      // Use p_DeleteAccountInsurances for delete operation
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_DeleteAccountInsurances", payload);
      console.log("[InsuranceService] deleteInsuranceRecord payload", payload);

      try {
        const response = await fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(envelope)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const raw = await response.json();
        console.log("[InsuranceService] deleteInsuranceRecord response", raw);

        // Treat any 200 response as success, including empty Details array
        // Format 1: { Details: [{ bResponse: true, ... }] }
        if (raw && raw.Details && Array.isArray(raw.Details)) {
          if (raw.Details.length === 0) {
            // Empty Details array is a valid success
            return { success: true, data: raw };
          }
          const result = raw.Details[0];
          if (result.bResponse === true) {
            return { success: true, data: result };
          } else {
            return { success: false, error: result.ErrorMsg || result.error || "Delete failed" };
          }
        }
        // Format 2: { bResponse: true, ... } (direct response)
        if (raw && raw.bResponse === true) {
          return { success: true, data: raw };
        }
        // Format 3: { success: true } (normalized format)
        if (raw && raw.success === true) {
          return { success: true, data: raw };
        }
        // If we get here, but we got a 200 response, treat as success
        return { success: true, data: raw };
      } catch (error) {
        console.error("[InsuranceService] deleteInsuranceRecord error", error);
        throw error;
      }
    }

    /**
     * Fetch dropdown data using LookupService
     * Maps dropdown types to their corresponding system code IDs
     */
    async fetchDropdownData(dropdownType = '') {
      console.log("[InsuranceService] fetchDropdownData for", dropdownType);

      if (!LookupService) {
        console.error("[InsuranceService] LookupService not available");
        throw new Error("LookupService not available");
      }

      try {
        let result = [];
        
        switch (dropdownType) {
          case 'InsuranceType':
            // Get insurance types from system codes using LifeInsuranceTypeID
            result = await LookupService.getSystemCodeOptions('LifeInsuranceTypeID');
            console.log('[InsuranceService] InsuranceType dropdown loaded with', result.length, 'options');
            break;
            
          case 'PremiumFrequency':
            // Get premium frequency from system codes using FrequencyID
            result = await LookupService.getSystemCodeOptions('FrequencyID');
            console.log('[InsuranceService] PremiumFrequency dropdown loaded with', result.length, 'options');
            break;
            
          case 'NomineeRelation':
            // Get nominee relation from system codes using RelationID
            result = await LookupService.getSystemCodeOptions('RelationID');
            console.log('[InsuranceService] NomineeRelation dropdown loaded with', result.length, 'options');
            break;
            
          default:
            console.warn("[InsuranceService] Unknown dropdown type:", dropdownType);
            result = [];
        }
        
        return result;
      } catch (error) {
        console.error("[InsuranceService] fetchDropdownData error", error);
        throw error;
      }
    }

    /**
     * Search for policies by account/policy number
     * Used for navigation and record lookup
     */
    async searchPolicies(context = {}) {
      const accountId = context.accountId || this.getDynamicValue('AccountID') || '';
      const advFilterString = `AccountID='${accountId}'`;
      const direction = context.direction || 0; // -1=prev, 0=search, 1=next
      const currentPolicyNo = context.currentPolicyNo || null;

      const payload = {
        WhereStmt: '',
        TableID: 'AccountInsuranceID',
        RefID: currentPolicyNo ? { PolicyNo: currentPolicyNo } : null,
        PrevOrNext: direction,
        AdvFilterString: advFilterString,
        OperatorID: this.getOperatorId(),
        ModuleID: 4305,
        OurBranchID: this.getOurBranchId(),
        SearchKey: null,
        LanguageID: 'en'
      };

      if (!SearchService) {
        console.error("[InsuranceService] SearchService not available");
        throw new Error("SearchService not available");
      }

      console.log("[InsuranceService] searchPolicies payload", payload);

      try {
        const raw = await SearchService.search(payload);
        console.log("[InsuranceService] searchPolicies response", raw);

        if (raw && Array.isArray(raw.Details)) {
          return raw.Details;
        }
        return [];
      } catch (error) {
        console.error("[InsuranceService] searchPolicies error", error);
        throw error;
      }
    }

    /**
     * Display search modal for policies using SearchModal class
     */
    displayPolicySearchModal(context = {}) {
      const SearchModal = global.SearchModal;
      if (!SearchModal) {
        console.error("[InsuranceService] SearchModal not available");
        return;
      }

      const accountId = context.accountId || this.getDynamicValue('AccountID') || '';
      const branchId = context.branchId || this.getOurBranchId();
      const operatorId = this.getOperatorId();
      const onSelect = context.onSelect || null;
      
      // AdvFilterString filters by AccountID
      const advFilterString = `AccountID='${accountId}'`;
      
      const modal = new SearchModal({
        prefix: 'insurance-policy-search',
        moduleID: this.moduleID,
        getOperatorId: () => operatorId,
        getOurBranchId: () => branchId
      });

      modal.open({
        tableID: 'AccountInsuranceID',
        whereStmt: '',
        advFilterString: advFilterString,
        searchKey: '',
        searchFields: [
          { name: 'PolicyNo', label: 'Policy No', column: 'PolicyNo' },
          { name: 'PolicyDate', label: 'Policy Date', column: 'PolicyDate' },
          { name: 'PolicyMaturityDate', label: 'Maturity Date', column: 'PolicyMaturityDate' }
        ],
        onSelect: onSelect || (() => {})  // Pass onSelect callback if provided
      });

      return modal;
    }

    /**
     * Display search modal for insurance companies using SearchModal class
     */
    displayCompanySearchModal(context = {}) {
      const SearchModal = global.SearchModal;
      if (!SearchModal) {
        console.error("[InsuranceService] SearchModal not available");
        return;
      }

      const branchId = context.branchId || this.getOurBranchId();
      const operatorId = this.getOperatorId();
      const onSelect = context.onSelect || null;
      
      const modal = new SearchModal({
        prefix: 'insurance-company-search',
        moduleID: this.moduleID,
        getOperatorId: () => operatorId,
        getOurBranchId: () => branchId
      });

      modal.open({
        tableID: 'InsuranceID',
        whereStmt: '',
        advFilterString: '',
        searchKey: '',
        searchFields: [
          { name: 'InsuranceID', label: 'Company ID', column: 'InsuranceID' },
          { name: 'name', label: 'Company Name', column: 'name' }
        ],
        onSelect: onSelect || (() => {})  // Pass onSelect callback if provided
      });

      return modal;
    }
  }

  // Export service globally
  global.InsuranceService = InsuranceService;
  console.log("[InsuranceService] Service initialized");
})(window);
