(function (global) {
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};
  const BASE_URL = (Environment.baseUrlLoans || Environment.baseUrlCommon || "http://localhost:XXXX").replace(/\/+$/, "");
  const ENDPOINT = `${BASE_URL}/api/OldAPI`;

  class LoanGuarantorService {
    constructor() {
      this.moduleID = "4350"; // Loan Guarantor
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

    async fetchGuarantors(context = {}) {
      const payload = {
        ModuleID: this.moduleID,
        OurBranchID: context.branchId || this.getOurBranchId(),
        AccountID: context.accountId || "",
        AccountSeries: context.accountSeries || 0,
        GuarantorID: "",
        OperatorID: this.getOperatorId(),
        Direction: 0
      };

      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetAccountGuarantors", payload);
      console.log("[LoanGuarantorService] fetchGuarantors payload", payload);

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
        console.log("[LoanGuarantorService] fetchGuarantors response", raw);

        // Return full response with Details02 (grid rows)
        return raw || { Details02: [] };
      } catch (error) {
        console.error("[LoanGuarantorService] fetchGuarantors error", error);
        throw error;
      }
    }

    async fetchGuarantorDetails(context = {}) {
      const payload = {
        ModuleID: this.moduleID,
        OurBranchID: context.branchId || this.getOurBranchId(),
        AccountID: context.accountId || "",
        AccountSeries: context.accountSeries || 0,
        GuarantorID: "",
        OperatorID: this.getOperatorId(),
        Direction: 0
      };

      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetAccountGuarantors", payload);
      console.log("[LoanGuarantorService] fetchGuarantorDetails payload", payload);

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
        console.log("[LoanGuarantorService] fetchGuarantorDetails response", raw);

        // Return full response with Details01 (master data)
        return raw || { Details01: [] };
      } catch (error) {
        console.error("[LoanGuarantorService] fetchGuarantorDetails error", error);
        throw error;
      }
    }

    async saveGuarantor(payload) {
      const savePayload = {
        OurBranchID: payload.OurBranchID !== undefined ? payload.OurBranchID : '',
        AccountID: payload.AccountID !== undefined ? payload.AccountID : '',
        AccountSeries: payload.AccountSeries !== undefined ? payload.AccountSeries : 0,
        GuarantorID: payload.GuarantorID !== undefined ? payload.GuarantorID : '',
        GuaranteeAmount: payload.GuaranteeAmount !== undefined ? payload.GuaranteeAmount : 0,
        Remarks: payload.Remarks !== undefined ? payload.Remarks : '',
        CreatedBy: payload.CreatedBy !== undefined ? payload.CreatedBy : this.getOperatorId(),
        CreatedOn: payload.CreatedOn !== undefined ? payload.CreatedOn : '',
        ModifiedBy: payload.ModifiedBy !== undefined ? payload.ModifiedBy : '',
        ModifiedOn: payload.ModifiedOn !== undefined ? payload.ModifiedOn : '',
        SupervisedBy: payload.SupervisedBy !== undefined ? payload.SupervisedBy : '',
        NewRecord: payload.NewRecord !== undefined ? payload.NewRecord : 1
      };

      const envelope = CoreApi.makeRequestEnvelope("dbo.p_AddEditAccountGuarantors", savePayload);
      console.log("[LoanGuarantorService] saveGuarantor envelope", envelope);

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
        console.log("[LoanGuarantorService] saveGuarantor response", raw);

        // Treat any 200 response as success, including empty Details array
        if (raw && raw.Details && Array.isArray(raw.Details)) {
          if (raw.Details.length === 0) {
            return { success: true, data: raw };
          }
          const result = raw.Details[0];
          if (result.bResponse === true) {
            return { success: true, data: result };
          } else {
            return { success: false, error: result.ErrorMsg || result.error || "Save failed" };
          }
        }
        // Direct response format
        if (raw && raw.bResponse === true) {
          return { success: true, data: raw };
        }
        // If we get here but got 200, treat as success
        return { success: true, data: raw };
      } catch (error) {
        console.error("[LoanGuarantorService] saveGuarantor error", error);
        throw error;
      }
    }

    /**
     * Fetch dropdown data using LookupService
     * Maps dropdown types to their corresponding system code IDs
     */
    async fetchDropdownData(dropdownType = '') {
      console.log("[LoanGuarantorService] fetchDropdownData for", dropdownType);

      const LookupService = global.LookupService;
      if (!LookupService) {
        console.error("[LoanGuarantorService] LookupService not available");
        throw new Error("LookupService not available");
      }

      try {
        let result = [];
        
        switch (dropdownType) {
          case 'GuarantorType':
            // Get guarantor types from system codes using GuarantorTypeID
            result = await LookupService.getSystemCodeOptions('GuarantorTypeID');
            console.log('[LoanGuarantorService] GuarantorType dropdown loaded with', result.length, 'options');
            break;
            
          default:
            console.warn("[LoanGuarantorService] Unknown dropdown type:", dropdownType);
            result = [];
        }
        
        return result;
      } catch (error) {
        console.error("[LoanGuarantorService] fetchDropdownData error", error);
        throw error;
      }
    }

    /**
     * Display search modal for guarantors using SearchModal class
     * Mode: 'view' - search existing guarantors for this account (AccountGuarantorID)
     * Mode: 'add' - search all available guarantors to add (GuarantorID)
     */
    displayGuarantorSearchModal(context = {}) {
      const SearchModal = global.SearchModal;
      if (!SearchModal) {
        console.error("[LoanGuarantorService] SearchModal not available");
        return;
      }

      const branchId = context.branchId || this.getOurBranchId();
      const accountId = context.accountId || this.getDynamicValue('AccountID') || '';
      const accountSeries = context.accountSeries || this.getDynamicValue('LoanSeries') || '0';
      const operatorId = this.getOperatorId();
      const onSelect = context.onSelect || null;
      const mode = context.mode || 'view'; // 'view' or 'add'
      const guarantorType = context.guarantorType || '';
      
      let tableID, advFilterString, searchKey, prevOrNext;
      
      if (mode === 'add') {
        // ADD MODE: Search all available guarantors in the system
        tableID = 'GuarantorID';
        // Filter by BankID, exclude current account's client, and filter by guarantor type if selected
        let filters = [`BankID='00'`];
        if (accountId) {
          filters.push(`GuarantorRelevantID <> '${accountId}'`);
        }
        if (guarantorType) {
          filters.push(`GuarantorTypeID='${guarantorType}'`);
        }
        advFilterString = filters.join(' AND ');
        searchKey = null;
        prevOrNext = 0;
      } else {
        // VIEW MODE: Search existing guarantors for this account
        tableID = 'AccountGuarantorID';
        advFilterString = `OurBranchID='${branchId}' AND AccountID='${accountId}' AND AccountSeries='${accountSeries}'`;
        searchKey = `[OurBranchID:${branchId}][AccountID:${accountId}][GuarantorID:]`;
        prevOrNext = 1;
      }
      
      const modal = new SearchModal({
        prefix: 'guarantor-search',
        moduleID: '4310',
        getOperatorId: () => operatorId,
        getOurBranchId: () => branchId
      });

      modal.open({
        tableID: tableID,
        whereStmt: '',
        advFilterString: advFilterString,
        searchKey: searchKey,
        prevOrNext: prevOrNext,
        searchFields: [
          { name: 'GuarantorID', label: 'Guarantor ID', column: 'GuarantorID' },
          { name: 'GuarantorName', label: 'Guarantor Name', column: 'GuarantorName' },
          { name: 'GuaranteeAmount', label: 'Guarantee Amount', column: 'GuaranteeAmount' }
        ],
        onSelect: onSelect || (() => {})
      });

      return modal;
    }

    displaySearchModal(fieldName, tableID, whereStmt, context = {}) {
      const SearchModal = global.SearchModal;
      if (!SearchModal) {
        alert('Search modal not available');
        return;
      }

      const branchId = context.branchId || this.getOurBranchId();
      const operatorId = this.getOperatorId();
      const moduleID = this.moduleID;

      const modal = new SearchModal({
        prefix: 'lg-guarantor-search',
        moduleID,
        getOperatorId: () => operatorId,
        getOurBranchId: () => branchId
      });

      modal.open({
        tableID: tableID || 'GuarantorID',
        whereStmt: whereStmt || '',
        advFilterString: `OurBranchID='${branchId}'`,
        searchKey: `[GuarantorID:]`,
        searchFields: [
          { name: 'GuarantorID', label: 'Guarantor ID', column: 'GuarantorID' },
          { name: 'GuarantorName', label: 'Guarantor Name', column: 'GuarantorName' }
        ],
        onSelect: async (record) => {
          const el = document.getElementById('GuarantorID');
          if (el) {
            el.value = record.GuarantorID || '';
            el.dispatchEvent(new Event('blur'));
          }
        }
      });
    }

    initializeLookupButtons() {
      const btn = document.querySelector('button[data-lookup="guarantor"]');
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const parentDoc = window.parent?.document;
          const read = (id) => parentDoc?.getElementById(id)?.value?.trim?.() || "";
          const branchId = read("BranchID");
          const context = { branchId };
          window.LoanGuarantorService.displaySearchModal('GuarantorID', 'GuarantorID', '', context);
        });
      }
    }
  }

  global.LoanGuarantorService = new LoanGuarantorService();
})(typeof window !== "undefined" ? window : this);
