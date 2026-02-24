(function (global) {
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};
  const BASE_URL = (Environment.baseUrlLoans || Environment.baseUrlCommon || "http://localhost:XXXX").replace(/\/+$/, "");
  const ENDPOINT = `${BASE_URL}/api/OldAPI`;

  class LoanReleaseFreezeService {
    constructor() {
      this.moduleID = "4340"; // Release Freeze Instruction
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

    /**
     * Fetch account freeze records for the given account
     */
    async fetchFreezes(context = {}) {
      const payload = {
        ModuleID: this.moduleID,
        OurBranchID: context.branchId || this.getOurBranchId(),
        AccountID: context.accountId || "",
        LoanSeries: context.loanSeries || 0,
        OperatorID: this.getOperatorId(),
        Direction: 0
      };

      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetAccountFreezes", payload);
      console.log("[LoanReleaseFreezeService] fetchFreezes payload", payload);

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
        console.log("[LoanReleaseFreezeService] fetchFreezes response", raw);

        // Handle both Details array and direct response
        if (raw && raw.Details && Array.isArray(raw.Details)) {
          return {
            success: true,
            data: raw.Details || [],
            Details01: raw.Details01 || [],
            Details02: raw.Details02 || []
          };
        }

        return { success: true, data: raw || [], Details01: [], Details02: [] };
      } catch (error) {
        console.error("[LoanReleaseFreezeService] fetchFreezes error", error);
        throw error;
      }
    }

    /**
     * Save release freeze instructions
     */
    async saveFreezeRelease(payload) {
      const savePayload = {
        OurBranchID: payload.OurBranchID !== undefined ? payload.OurBranchID : '',
        AccountID: payload.AccountID !== undefined ? payload.AccountID : '',
        LoanSeries: payload.LoanSeries !== undefined ? payload.LoanSeries : 0,
        TableID: payload.TableID !== undefined ? payload.TableID : '',
        ReferenceID: payload.ReferenceID !== undefined ? payload.ReferenceID : '',
        FreezeValue: payload.FreezeValue !== undefined ? payload.FreezeValue : 0,
        Description: payload.Description !== undefined ? payload.Description : '',
        FreezedDate: payload.FreezedDate !== undefined ? payload.FreezedDate : '',
        EffectiveDate: payload.EffectiveDate !== undefined ? payload.EffectiveDate : '',
        FreezeCategory: payload.FreezeCategory !== undefined ? payload.FreezeCategory : '',
        Reason: payload.Reason !== undefined ? payload.Reason : '',
        CreatedBy: payload.CreatedBy !== undefined ? payload.CreatedBy : this.getOperatorId(),
        CreatedOn: payload.CreatedOn !== undefined ? payload.CreatedOn : '',
        ModifiedBy: payload.ModifiedBy !== undefined ? payload.ModifiedBy : '',
        ModifiedOn: payload.ModifiedOn !== undefined ? payload.ModifiedOn : '',
        SupervisedBy: payload.SupervisedBy !== undefined ? payload.SupervisedBy : '',
        UpdateCount: payload.UpdateCount !== undefined ? payload.UpdateCount : 0,
        NewRecord: payload.NewRecord !== undefined ? payload.NewRecord : 0
      };

      const envelope = CoreApi.makeRequestEnvelope("dbo.p_ReleaseFreezeInstruction", savePayload);
      console.log("[LoanReleaseFreezeService] saveFreezeRelease envelope", envelope);

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
        console.log("[LoanReleaseFreezeService] saveFreezeRelease response", raw);

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

        if (raw && raw.bResponse === true) {
          return { success: true, data: raw };
        }

        return { success: true, data: raw };
      } catch (error) {
        console.error("[LoanReleaseFreezeService] saveFreezeRelease error", error);
        throw error;
      }
    }

    /**
     * Check user rights for Release Freeze operations
     */
    async checkUserRights(context = {}) {
      const payload = {
        ModuleID: this.moduleID,
        OurBranchID: context.branchId || this.getOurBranchId(),
        AccountID: context.accountId || "",
        LoanSeries: context.loanSeries || 0,
        UpdateCount: context.updateCount || 0,
        OperatorID: this.getOperatorId()
      };

      const envelope = CoreApi.makeRequestEnvelope("dbo.p_CheckUserRights", payload);
      console.log("[LoanReleaseFreezeService] checkUserRights payload", payload);

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
        console.log("[LoanReleaseFreezeService] checkUserRights response", raw);

        if (raw && raw.Details && Array.isArray(raw.Details) && raw.Details.length > 0) {
          return { success: true, isSupervised: raw.Details[0]?.IsSupervised || false };
        }

        return { success: true, isSupervised: false };
      } catch (error) {
        console.error("[LoanReleaseFreezeService] checkUserRights error", error);
        throw error;
      }
    }
  }

  // Export to global
  if (!global.LoanReleaseFreezeService) {
    global.LoanReleaseFreezeService = new LoanReleaseFreezeService();
  }
})(window);
