   (function (global) {
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};

  if (!CoreApi) {
    console.error(
      "CoreApi is not loaded. Ensure services/shared/coreApi.js is included before letterOfGuaranteeService.js."
    );
    return;
  }

  // All LG requests go through baseUrlCommon/api/OldAPI
  const BASE_URL = (Environment.baseUrlCommon || "http://localhost:XXXX").replace(/\/+$/, "");
  const LG_ENDPOINT = `${BASE_URL}/api/OldAPI`;

  const pad2 = (n) => String(n).padStart(2, '0');

  // Some OldAPI deployments expect a human-readable RequestTime.
  // Example: 01/20/2026 05:54:05
  const getLegacyRequestTime = () => {
    const d = new Date();
    const mm = pad2(d.getMonth() + 1);
    const dd = pad2(d.getDate());
    const yyyy = d.getFullYear();
    const hh = pad2(d.getHours());
    const mi = pad2(d.getMinutes());
    const ss = pad2(d.getSeconds());
    return `${mm}/${dd}/${yyyy} ${hh}:${mi}:${ss}`;
  };

  const makeOldApiEnvelope = (formId, requestData) => {
    // Match the legacy OldAPI payload shape used by LG screens.
    // Sample:
    // {
    //   RequestID: "dbo.p_GetLGAccountApplication",
    //   FormId: "dbo.p_GetLGAccountApplication",
    //   RequestData: { ... },
    //   RequestTime: "01/20/2026 05:54:05",
    //   AppName: "PROJECT_KAIRO",
    //   Checksum: ""
    // }
    const appName = Environment.appName || 'PROJECT_KAIRO';
    const requestTime = getLegacyRequestTime();

    return {
      RequestID: formId,
      FormId: formId,
      RequestData: requestData,
      RequestTime: requestTime,
      AppName: appName,
      Checksum: ""
    };
  };

  const LetterOfGuaranteeService = {
    /**
     * Get LG Account Application
     * @param {object|string} requestDataOrBranch - Either requestData object OR OurBranchID string
     * @param {string} [applicationId] - ApplicationID (when using discrete args)
     * @param {string} [operatorId] - OperatorID (when using discrete args)
     * @param {string} [direction] - Direction (when using discrete args)
     * @param {string} [bankId] - BankID (when using discrete args)
     * @returns {Promise} Normalized response with { success, code, message, data }
     */
    getLGAccountApplication(requestDataOrBranch, applicationId, operatorId, direction, bankId) {
      const formId = "dbo.p_GetLGAccountApplication";

      const requestData = typeof requestDataOrBranch === 'object' && requestDataOrBranch
        ? requestDataOrBranch
        : {
          OurBranchID: requestDataOrBranch,
          ApplicationID: applicationId,
          OperatorID: operatorId,
          Direction: direction,
          BankID: bankId
        };

      const envelope = makeOldApiEnvelope(formId, requestData);
      return CoreApi.post(LG_ENDPOINT, envelope);
    },

    /**
     * Get LG Account Guarantors
     * @param {object} requestData - { ModuleID, OurBranchID, AccountID, AccountSeries, GuarantorID, OperatorID, Direction }
     * @returns {Promise} Normalized response with { success, code, message, data }
     */
    getAccountGuarantors(requestData) {
      const formId = "dbo.p_GetAccountGuarantors";
      const envelope = makeOldApiEnvelope(formId, requestData);
      return CoreApi.post(LG_ENDPOINT, envelope);
    },

    /**
     * Get LG Notes
     * @param {object} requestData - { ourbranchID, ModuleID, SearchID }
     * @returns {Promise} Normalized response with { success, code, message, data }
     */
    getNotes(requestData) {
      const formId = "dbo.p_GetNotes";
      const envelope = makeOldApiEnvelope(formId, requestData);
      return CoreApi.post(LG_ENDPOINT, envelope);
    },

    /**
     * Update LG Notes
     * @param {object} requestData - { OurBranchID, ModuleID, Searchkey, Notes, CreatedBy, CreatedOn, ModifiedBy, ModifiedOn, SupervisedBy, SupervisedOn, UpdateCount }
     * @returns {Promise} Normalized response with { success, code, message, data }
     */
    updateNotes(requestData) {
      const formId = "dbo.p_UpdateNotes";
      const envelope = makeOldApiEnvelope(formId, requestData);
      return CoreApi.post(LG_ENDPOINT, envelope);
    }
    ,
    /**
     * Add/Edit LG Account Application
     * @param {object} requestData - Built from the LG Application form
     * @returns {Promise} Normalized response with { success, code, message, data }
     */

    addEditLGAccountApplication(requestData) {
      // Stored procedure name is inferred; adjust if backend differs
      const formId = "dbo.p_AddEditLGAccountApplication";
      const envelope = makeOldApiEnvelope(formId, requestData);
      return CoreApi.post(LG_ENDPOINT, envelope);
    }

    /**
     * Validate LG ProductID using dbo.p_GetIDDescription.
     * Returns { valid, description, currencyId }.
     */
    ,async validateLGProductID({ branchId, productId, bankId }) {
      const formId = "dbo.p_GetIDDescription";
      const effectiveBankId = bankId || "00";
      const requestData = {
        OurBranchID: branchId,
        ControlTypeID: "ProductID",
        ID: productId,
        BankID: effectiveBankId,
        TypeID: productId,
        AdvanceFilter: `BankID='${effectiveBankId}' AND ProductTypeID='LG'`,
        LanguageID: "en"
      };

      const envelope = makeOldApiEnvelope(formId, requestData);

      try {
        const resp = await CoreApi.post(LG_ENDPOINT, envelope);
        const details = resp?.data?.Details || resp?.Details || [];
        if (!Array.isArray(details) || details.length === 0) {
          return { valid: false };
        }

        const first = details[0];
        if (first?.ProductTypeID !== "LG") {
          return { valid: false };
        }

        return {
          valid: true,
          description: first?.Description || "",
          currencyId: first?.CurrencyID || ""
        };
      } catch (error) {
        console.error("[LetterOfGuaranteeService] validateLGProductID error:", error);
        return { valid: false, error };
      }
    }

    /**
     * Validate BranchID using dbo.p_GetIDDescription.
     * Returns { valid, branchName }.
     */
    ,async validateBranchID({ branchId, bankId, typeId }) {
      const formId = "dbo.p_GetIDDescription";
      const effectiveBankId = bankId || "00";
      const typedBranchId = typeId || branchId;
      const requestData = {
        OurBranchID: branchId,
        ControlTypeID: "BranchID",
        ID: typedBranchId,
        BankID: effectiveBankId,
        TypeID: typedBranchId,
        AdvanceFilter: "",
        LanguageID: "en"
      };

      const envelope = makeOldApiEnvelope(formId, requestData);

      try {
        const resp = await CoreApi.post(LG_ENDPOINT, envelope);
        const details = resp?.data?.Details || resp?.Details || [];
        if (!Array.isArray(details) || details.length === 0) {
          return { valid: false };
        }
        const first = details[0];
        return {
          valid: true,
          branchName: first?.BranchName || ""
        };
      } catch (error) {
        console.error("[LetterOfGuaranteeService] validateBranchID error:", error);
        return { valid: false, error };
      }
    }

    /**
     * Get MeanRate for a given CurrencyID and ValueDate (REV rate type)
     * @param {string} branchId
     * @param {string} valueDate - in MM/DD/YYYY or YYYY-MM-DD
     * @param {string} currencyId
     * @returns {Promise<number|null>} MeanRate or null if not found
     */
    ,async getProductMeanRateREV(branchId, valueDate, currencyId) {
      const formId = "dbo.pc_CurrencyRates";
      const requestData = {
        OurBranchID: branchId,
        ValueDate: valueDate,
      };
      const envelope = makeOldApiEnvelope(formId, requestData);
      const resp = await CoreApi.post(LG_ENDPOINT, envelope);

      // Normalize response
      const details = resp?.data?.Details || resp?.Details || [];
      if (!Array.isArray(details)) return null;

      const match = details.find(
        (row) => row.CurrencyID === currencyId && row.RateTypeID === "REV"
      );
      return match ? match.MeanRate : null;
    }
 

    
  };

  global.LetterOfGuaranteeService = LetterOfGuaranteeService;
})(window);
