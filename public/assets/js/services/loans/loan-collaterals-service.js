(function (global) {
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};
  const SearchService = global.SearchService;
  const BASE_URL = (Environment.baseUrlLoans || Environment.baseUrlCommon || "http://localhost:XXXX").replace(/\/+$/, "");
  const ENDPOINT = `${BASE_URL}/api/OldAPI`;

  class LoanCollateralsService {
    constructor() {
      this.moduleID = "4310"; // Loan Collaterals
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

    resolvePlaceholders(stmt) {
      if (!stmt) return "";
      let resolved = stmt;
      resolved = resolved.replace(/\$BranchID\$/g, this.getOurBranchId());
      return resolved;
    }

    async fetchCollaterals(context = {}) {
      const payload = {
        OurBranchID: context.branchId || this.getOurBranchId(),
        AccountID: context.accountId || "",
        LoanSeries: context.loanSeries || "",
        CollateralID: "",
        RefNo: 0,
        OperatorID: this.getOperatorId(),
        Direction: 0
      };

      // Use p_GetAccountCollaterals which returns all result sets including the grid data
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetAccountCollaterals", payload);
      console.log("[LoanCollateralsService] fetchCollaterals payload", payload);

      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(envelope)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const raw = await response.json();
      console.log("[LoanCollateralsService] fetchCollaterals raw", raw);

      // Return Details02 which contains the list of account collateral assignments (grid data)
      if (raw && Array.isArray(raw.Details02)) {
        return raw.Details02;
      }
      
      return [];
    }

    async fetchAccountCollaterals(context = {}) {
      const payload = {
        OurBranchID: context.branchId || this.getOurBranchId(),
        AccountID: context.accountId || "",
        LoanSeries: context.loanSeries || "",
        CollateralID: "",
        RefNo: 0,
        OperatorID: this.getOperatorId(),
        Direction: 0
      };

      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetAccountCollaterals", payload);
      console.log("[LoanCollateralsService] fetchAccountCollaterals payload", payload);

      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(envelope)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const raw = await response.json();
      console.log("[LoanCollateralsService] fetchAccountCollaterals raw", raw);

      // Return Details01 which contains the collateral master data
      if (raw && Array.isArray(raw.Details01)) {
        return raw.Details01;
      }
      return [];
    }

    async saveCollateral(payload) {
      // Build the correct payload structure for p_AddEditAccountCollaterals
      // Use !== undefined checks to preserve empty strings and falsy values like 0
      const savePayload = {
        OurBranchID: payload.OurBranchID !== undefined ? payload.OurBranchID : '',
        AccountID: payload.AccountID !== undefined ? payload.AccountID : '',
        LoanSeries: payload.LoanSeries !== undefined ? payload.LoanSeries : 0,
        CollateralID: payload.CollateralID !== undefined ? payload.CollateralID : '',
        RefNo: payload.RefNo !== undefined ? payload.RefNo : 0,
        AssignedDate: payload.AssignedDate !== undefined ? payload.AssignedDate : '',
        ApportionedRatio: payload.ApportionedRatio !== undefined ? payload.ApportionedRatio : 0,
        ApportionedValue: payload.ApportionedValue !== undefined ? payload.ApportionedValue : 0,
        Margin: payload.Margin !== undefined ? payload.Margin : 0,
        NetCollateralValue: payload.ApportionedCollateralValue !== undefined ? payload.ApportionedCollateralValue : 0,
        ExchangeRate: payload.ExchangeRate !== undefined ? payload.ExchangeRate : 1,
        WorkingDate: payload.WorkingDate !== undefined ? payload.WorkingDate : '',
        CreatedBy: payload.CreatedBy !== undefined ? payload.CreatedBy : (payload.OperatorID || 'MARTIN_MARANGA'),
        CreatedOn: payload.CreatedOn !== undefined ? payload.CreatedOn : '',
        SupervisedBy: payload.SupervisedBy !== undefined ? payload.SupervisedBy : ''
      };

      const envelope = CoreApi.makeRequestEnvelope("dbo.p_AddEditAccountCollaterals", savePayload);
      console.log("[LoanCollateralsService] saveCollateral payload", savePayload);

      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(envelope)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const raw = await response.json();
      console.log("[LoanCollateralsService] saveCollateral raw", raw);

      return { success: true, message: "Collateral saved" };
    }

    async fetchCollateralDetails(ourBranchID, collateralID, moduleID, relevantID, operatorID) {
      const payload = {
        OurBranchID: ourBranchID,
        CollateralID: collateralID,
        ModuleID: moduleID,
        ReleventID: relevantID,
        OperatorID: operatorID
      };

      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetCollateralDetails", payload);
      console.log("[LoanCollateralsService] fetchCollateralDetails payload", payload);

      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(envelope)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const raw = await response.json();
      console.log("[LoanCollateralsService] fetchCollateralDetails raw", raw);

      // Normalize response - the result should have a Details array
      const details = this.normalizeRows(raw);
      return { Details: details };
    }

    normalizeRows(raw) {
      if (!raw) return [];
      if (Array.isArray(raw.Details)) return raw.Details;
      if (raw.Details01) return raw.Details01;
      if (raw.result?.ResultSets?.[0]) return raw.result.ResultSets[0];
      if (raw.Data?.RecordSet) return raw.Data.RecordSet;
      return [];
    }


    displaySearchModal(fieldName, tableID, whereStmt, context = {}) {
      // Use global SearchModal if available
      const SearchModal = global.SearchModal;
      if (!SearchModal) {
        alert('Search modal not available');
        return;
      }
      const branchId = context.branchId || this.getOurBranchId();
      const accountId = context.accountId || '';
      const operatorId = this.getOperatorId();
      const moduleID = this.moduleID;
      // AdvFilterString as per requirements
      const advFilter = `OurBranchID='${branchId}' AND CollateralStatusID='A' AND CollateralID NOT IN (select CollateralID from v_AccountCollateral where RecordStatusID='A')`;
      const searchKey = `[AccountID:${accountId}][CollateralID:]`;
      const modal = new SearchModal({
        prefix: 'lcol-collateral-search',
        moduleID,
        getOperatorId: () => operatorId,
        getOurBranchId: () => branchId
      });
      modal.open({
        tableID: tableID || 'CollateralID',
        whereStmt: whereStmt || '',
        advFilterString: advFilter,
        searchKey,
        searchFields: [
          { name: 'CollateralID', label: 'Collateral ID', column: 'CollateralID' },
          { name: 'Description', label: 'Description', column: 'Description' }
        ],
        onSelect: async (record) => {
          // Set CollateralID field in the form
          const el = document.getElementById('CollateralID');
          if (el) {
            el.value = record.CollateralID || '';
            // Trigger blur event to fetch collateral details
            el.dispatchEvent(new Event('blur'));
          }
        }
      });
    }

    async withdrawCollateral(payload) {
      // Build the correct payload structure for p_CloseAccountCollaterals
      const withdrawPayload = {
        OurBranchID: payload.OurBranchID || '',
        AccountID: payload.AccountID || '',
        LoanSeries: payload.LoanSeries || 0,
        CollateralID: payload.CollateralID || '',
        RefNo: payload.RefNo || 0,
        WithdrawnBy: payload.WithdrawnBy || this.getOperatorId(),
        WithdrawnDate: payload.WithdrawnDate || new Date().toISOString().split('T')[0],
        WithdrawnReason: payload.WithdrawnReason || '',
        SupervisedBy: payload.SupervisedBy || null
      };

      const envelope = CoreApi.makeRequestEnvelope("dbo.p_CloseAccountCollaterals", withdrawPayload);
      console.log("[LoanCollateralsService] withdrawCollateral payload", withdrawPayload);

      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(envelope)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const raw = await response.json();
      console.log("[LoanCollateralsService] withdrawCollateral raw", raw);

      return { success: true, message: "Collateral withdrawn successfully" };
    }

    initializeLookupButtons() {
      // Attach event listener to the collateral lookup button
      const btn = document.querySelector('button[data-lookup="collateral"]');
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          // Gather context from parent or form
          let branchId = '';
          let accountId = '';
          const parentDoc = window.parent?.document;
          if (parentDoc) {
            branchId = parentDoc.getElementById('BranchID')?.value?.trim?.() || '';
            accountId = parentDoc.getElementById('AccountID')?.value?.trim?.() || '';
          } else {
            branchId = document.getElementById('BranchID')?.value?.trim?.() || '';
            accountId = document.getElementById('AccountID')?.value?.trim?.() || '';
          }
          const context = { branchId, accountId };
          window.LoanCollateralsService.displaySearchModal('CollateralID', 'CollateralID', '', context);
        });
      }
    }
  }

  global.LoanCollateralsService = new LoanCollateralsService();
})(typeof window !== "undefined" ? window : this);
