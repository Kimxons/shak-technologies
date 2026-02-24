(function (global) {
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};

  if (!CoreApi) {
    console.error(
      "CoreApi is not loaded. Ensure services/shared/coreApi.js is included before productLgLcService.js."
    );
    return;
  }

  const BASE_URL = (Environment.baseUrlCommon || "http://localhost:5059").replace(/\/+$/, "");
  const PRODUCT_ENDPOINT = `${BASE_URL}/api/OldAPI`;

  const ProductLgLcService = {
    /**
     * Get LG/LC product details.
     * Stored procedure: dbo.p_GetLGLCProduct
     * @param {object} requestData - { BankID, OurBranchID, ProductID, OperatorID, Direction }
     */
    getProduct(requestData) {
      const formId = "dbo.p_GetLGLCProduct";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(PRODUCT_ENDPOINT, envelope);
    },

    /**
     * Get Treasury product details.
     * Stored procedure: dbo.p_GetProductTreasury
     * @param {object} requestData - { BankID, OurBranchID, ProductID, ProductSubTypeID, OperatorID, Direction }
     */
    getProductTreasury(requestData) {
      const formId = "dbo.p_GetProductTreasury";

      const formatLegacyRequestTime = (d = new Date()) => {
        const pad2 = (n) => String(n).padStart(2, "0");
        const mm = pad2(d.getMonth() + 1);
        const dd = pad2(d.getDate());
        const yyyy = d.getFullYear();
        const hh = pad2(d.getHours());
        const mi = pad2(d.getMinutes());
        const ss = pad2(d.getSeconds());
        return `${mm}/${dd}/${yyyy} ${hh}:${mi}:${ss}`;
      };

      const envelope = CoreApi.makeRequestEnvelope(formId, requestData, Environment.appName || "PROJECT_KAIRO");

      try {
        const debug = global.__CORE_API_DEBUG__ === true || global.localStorage?.getItem?.("coreApiDebug") === "1";
        if (debug) {
          console.groupCollapsed("[ProductLgLcService] getProductTreasury");
          console.info("Endpoint", PRODUCT_ENDPOINT);
          console.info("RequestData", requestData);
          console.info("Envelope", envelope);
          console.groupEnd();
        } else {
          console.log("[ProductLgLcService] getProductTreasury calling", formId, requestData);
        }
      } catch {
        // ignore logging errors
      }

      // Align with legacy request contract expected by OldAPI
      envelope.RequestID = formId;
      envelope.FormID = formId;
      envelope.FormId = formId;
      envelope.RequestTime = formatLegacyRequestTime();

      return CoreApi.post(PRODUCT_ENDPOINT, envelope);
    },

    /**
     * Add or Edit Treasury product.
     * Stored procedure: dbo.p_AddEditProductTreasury
     * @param {object} requestData - {
     *   BankID, ProductID, Description, ProductTypeID, ProductSubTypeID, ProductCategoryID,
     *   ProductClassID, CurrencyID, ValidFrom, ValidTo, ProductCode, AccountingRuleID,
     *   CrDayCountBasisID, CrRoundingID, IsCrIntTaxable, CrIntTaxID, IsCrIntAcrl,
     *   CrIntAcrlFrequencyID, CrIntApplnFrequencyID, DbDayCountBasisID, DbRoundingID,
     *   IsDbIntTaxable, DbIntTaxID, IsDbIntAcrl, DbIntAcrlFrequencyID, DbIntApplnFrequencyID,
     *   CreatedBy, CreatedOn, ModifiedBy, ModifiedOn, SupervisedBy, SupervisedOn,
     *   UpdateCount, CustomerRestriction
     * }
     */
    addEditProductTreasury(requestData) {
      const formId = "dbo.p_AddEditProductTreasury";

      const formatLegacyRequestTime = (d = new Date()) => {
        const pad2 = (n) => String(n).padStart(2, "0");
        const mm = pad2(d.getMonth() + 1);
        const dd = pad2(d.getDate());
        const yyyy = d.getFullYear();
        const hh = pad2(d.getHours());
        const mi = pad2(d.getMinutes());
        const ss = pad2(d.getSeconds());
        return `${mm}/${dd}/${yyyy} ${hh}:${mi}:${ss}`;
      };

      const envelope = CoreApi.makeRequestEnvelope(formId, requestData, Environment.appName || "PROJECT_KAIRO");

      try {
        const debug = global.__CORE_API_DEBUG__ === true || global.localStorage?.getItem?.("coreApiDebug") === "1";
        if (debug) {
          console.groupCollapsed("[ProductLgLcService] addEditProductTreasury");
          console.info("Endpoint", PRODUCT_ENDPOINT);
          console.info("RequestData", requestData);
          console.info("Envelope", envelope);
          console.groupEnd();
        } else {
          console.log("[ProductLgLcService] addEditProductTreasury calling", formId, requestData);
        }
      } catch {
        // ignore logging errors
      }

      // Align with legacy request contract expected by OldAPI
      envelope.RequestID = formId;
      envelope.FormID = formId;
      envelope.FormId = formId;
      envelope.RequestTime = formatLegacyRequestTime();

      return CoreApi.post(PRODUCT_ENDPOINT, envelope);
    },

    /**
     * Delete Treasury Product.
     * Stored procedure: dbo.p_DeleteProduct
     * @param {object} requestData - { BankID, ProductID, UpdateCount }
     */
    deleteProductTreasury(requestData) {
      const formId = "dbo.p_DeleteProduct";

      const formatLegacyRequestTime = (d = new Date()) => {
        const pad2 = (n) => String(n).padStart(2, "0");
        const mm = pad2(d.getMonth() + 1);
        const dd = pad2(d.getDate());
        const yyyy = d.getFullYear();
        const hh = pad2(d.getHours());
        const mi = pad2(d.getMinutes());
        const ss = pad2(d.getSeconds());
        return `${mm}/${dd}/${yyyy} ${hh}:${mi}:${ss}`;
      };

      const envelope = CoreApi.makeRequestEnvelope(formId, requestData, Environment.appName || "PROJECT_KAIRO");

      try {
        const debug = global.__CORE_API_DEBUG__ === true || global.localStorage?.getItem?.("coreApiDebug") === "1";
        if (debug) {
          console.groupCollapsed("[ProductLgLcService] deleteProductTreasury");
          console.info("Endpoint", PRODUCT_ENDPOINT);
          console.info("RequestData", requestData);
          console.info("Envelope", envelope);
          console.groupEnd();
        } else {
          console.log("[ProductLgLcService] deleteProductTreasury calling", formId, requestData);
        }
      } catch {
        // ignore logging errors
      }

      // Align with legacy request contract expected by OldAPI
      envelope.RequestID = formId;
      envelope.FormID = formId;
      envelope.FormId = formId;
      envelope.RequestTime = formatLegacyRequestTime();

      return CoreApi.post(PRODUCT_ENDPOINT, envelope);
    },

    /**
     * Get Product Accounting Rule details.
     * Stored procedure: dbo.p_GetProductAcRule
     * @param {object} requestData - { BankID, OurBranchID, AcRuleID, OperatorID }
     */
    getProductAcRule(requestData) {
      const formId = "dbo.p_GetProductAcRule";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(PRODUCT_ENDPOINT, envelope);
    },

    /**
     * Get Treasury product combo data.
     * Stored procedure: dbo.p_GetProductTreasuryCombo
     * @param {object} requestData - { BankID, LanguageID }
     */
    getProductTreasuryCombo(requestData) {
      const formId = "dbo.p_GetProductTreasuryCombo";

      const formatLegacyRequestTime = (d = new Date()) => {
        const pad2 = (n) => String(n).padStart(2, "0");
        const mm = pad2(d.getMonth() + 1);
        const dd = pad2(d.getDate());
        const yyyy = d.getFullYear();
        const hh = pad2(d.getHours());
        const mi = pad2(d.getMinutes());
        const ss = pad2(d.getSeconds());
        return `${mm}/${dd}/${yyyy} ${hh}:${mi}:${ss}`;
      };

      const envelope = CoreApi.makeRequestEnvelope(formId, requestData, Environment.appName || "PROJECT_KAIRO");

      try {
        const debug = global.__CORE_API_DEBUG__ === true || global.localStorage?.getItem?.("coreApiDebug") === "1";
        if (debug) {
          console.groupCollapsed("[ProductLgLcService] getProductTreasuryCombo");
          console.info("Endpoint", PRODUCT_ENDPOINT);
          console.info("RequestData", requestData);
          console.info("Envelope", envelope);
          console.groupEnd();
        }
      } catch {
        // ignore logging errors
      }

      // Align with legacy request contract expected by OldAPI
      envelope.RequestID = formId;
      envelope.FormID = formId;
      envelope.FormId = formId;
      envelope.RequestTime = formatLegacyRequestTime();

      return CoreApi.post(PRODUCT_ENDPOINT, envelope);
    },

    /**
     * Get product branch details.
     * Stored procedure: dbo.p_GetProductBranchDetail
     * @param {object} requestData - { OurBranchID, ProductID, OperatorID, Direction }
     */
    getProductBranchDetail(requestData) {
      const formId = "dbo.p_GetProductBranchDetail";

      const formatLegacyRequestTime = (d = new Date()) => {
        const pad2 = (n) => String(n).padStart(2, "0");
        const mm = pad2(d.getMonth() + 1);
        const dd = pad2(d.getDate());
        const yyyy = d.getFullYear();
        const hh = pad2(d.getHours());
        const mi = pad2(d.getMinutes());
        const ss = pad2(d.getSeconds());
        return `${mm}/${dd}/${yyyy} ${hh}:${mi}:${ss}`;
      };

      const envelope = CoreApi.makeRequestEnvelope(formId, requestData, Environment.appName || "PROJECT_KAIRO");

      try {
        const debug = global.__CORE_API_DEBUG__ === true || global.localStorage?.getItem?.("coreApiDebug") === "1";
        if (debug) {
          console.groupCollapsed("[ProductLgLcService] getProductBranchDetail");
          console.info("Endpoint", PRODUCT_ENDPOINT);
          console.info("RequestData", requestData);
          console.info("Envelope", envelope);
          console.groupEnd();
        }
      } catch {
        // ignore logging errors
      }

      // Align with required OldAPI request contract
      envelope.RequestID = formId;
      envelope.FormID = formId;
      envelope.FormId = formId;
      envelope.RequestTime = formatLegacyRequestTime();

      return CoreApi.post(PRODUCT_ENDPOINT, envelope);
    },

    /**
     * Add or Edit Product Accounting Rule.
     * Stored procedure: dbo.p_AddEditProductAcRule
     * @param {object} requestData - { BankID, AcRuleID, Description, ProductTypeID, CreatedBy, CreatedOn, ModifiedBy, ModifiedOn, SupervisedBy, UpdateCount }
     */
    addEditProductAcRule(requestData) {
      const formId = "dbo.p_AddEditProductAcRule";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(PRODUCT_ENDPOINT, envelope);
    },

    /**
     * Add or Edit Product Branch Detail.
     * Stored procedure: dbo.p_AddEditProductBranchDetail
     * @param {object} requestData - All product branch detail fields as per SP requirements.
     */
    addEditProductBranchDetail(requestData) {
      const formId = "dbo.p_AddEditProductBranchDetail";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(PRODUCT_ENDPOINT, envelope);
    },

    /**
     * Add or Edit LG/LC Product.
     * Stored procedure: dbo.p_AddEditLGLCProducts
     * @param {object} requestData - All product fields including BankID, ProductID, Description, etc.
     */
    addEditProduct(requestData) {
      const formId = "dbo.p_AddEditLGLCProducts";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(PRODUCT_ENDPOINT, envelope);
    },

    /**
     * Delete LG/LC Product.
     * Stored procedure: dbo.p_DeleteLGLCProduct
     * @param {object} requestData - { BankID, ProductID, UpdateCount }
     */
    deleteProduct(requestData) {
      const formId = "dbo.p_DeleteLGLCProduct";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(PRODUCT_ENDPOINT, envelope);
    },

    /**
     * Get Product Type system codes.
     * Stored procedure: p_v1_GetSystemCodes
     * @param {object} requestData - { CodeID: "ProductTypeID" }
     */
    getProductTypes(requestData) {
      const formId = "p_v1_GetSystemCodes";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(PRODUCT_ENDPOINT, envelope);
    },

    /**
     * Get GL Interface data.
     * Stored procedure: dbo.p_GetGLInterface
     * @param {object} requestData - { OurBranchID, BankID, RelevantID, ModuleID, OperatorID }
     */
    getGLInterface(requestData) {
      const formId = "dbo.p_GetGLInterface";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(PRODUCT_ENDPOINT, envelope);
    },

    /**
     * Delete Product Accounting Rule.
     * Stored procedure: dbo.p_DeleteProductAcRule
     * @param {object} requestData - { BankID, AcRuleID, UpdateCount }
     */
    deleteProductAcRule(requestData) {
      const formId = "dbo.p_DeleteProductAcRule";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(PRODUCT_ENDPOINT, envelope);
    },

    /**
     * Get Product Documents.
     * Stored procedure: dbo.p_GetProductDocuments
     * @param {object} requestData - { BankID, OurBranchID, ProductID, OperatorID }
     */
    getProductDocuments(requestData) {
      const formId = "dbo.p_GetProductDocuments";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(PRODUCT_ENDPOINT, envelope);
    },

    /**
     * Get Product Accounting Rule Details.
     * Stored procedure: dbo.p_GetProductAcRuleDetail
     * @param {object} requestData - { BankID, AcRuleID, SysEventID, OurBranchID, OperatorID }
     */
    getProductAcRuleDetail(requestData) {
      const formId = "dbo.p_GetProductAcRuleDetail";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(PRODUCT_ENDPOINT, envelope);
    },

    /**
     * Edit Product Documents.
     * Stored procedure: dbo.p_EditProductDocuments
     * RequestData shape:
     *   {
     *     BankID: "BankID",
     *     ProductID: "ProductID",
     *     OperatedBy: "OperatorID",
     *     OperatedOn: "smalldatetime", // MM/DD/YYYY HH:MM:SS
     *     SupervisedBy: "OperatorID",
     *     UpdateCount: "tinyint",
     *     DetailRecords: "xml"
     *   }
     */
    editProductDocuments(requestData) {
      const formId = "dbo.p_EditProductDocuments";

      const formatLegacyRequestTime = (d = new Date()) => {
        const pad2 = (n) => String(n).padStart(2, "0");
        const mm = pad2(d.getMonth() + 1);
        const dd = pad2(d.getDate());
        const yyyy = d.getFullYear();
        const hh = pad2(d.getHours());
        const mi = pad2(d.getMinutes());
        const ss = pad2(d.getSeconds());
        return `${mm}/${dd}/${yyyy} ${hh}:${mi}:${ss}`;
      };

      const envelope = CoreApi.makeRequestEnvelope(formId, requestData, Environment.appName || "PROJECT_KAIRO");

      try {
        const debug = global.__CORE_API_DEBUG__ === true || global.localStorage?.getItem?.("coreApiDebug") === "1";
        if (debug) {
          console.groupCollapsed("[ProductLgLcService] editProductDocuments");
          console.info("Endpoint", PRODUCT_ENDPOINT);
          console.info("RequestData", requestData);
          console.info("Envelope", envelope);
          console.groupEnd();
        } else {
          console.log("[ProductLgLcService] editProductDocuments calling", formId, requestData);
        }
      } catch {
        // ignore logging errors
      }

      // Align with legacy request contract expected by OldAPI
      envelope.RequestID = formId;
      envelope.FormID = formId;
      envelope.FormId = formId;
      envelope.RequestTime = formatLegacyRequestTime();

      return CoreApi.post(PRODUCT_ENDPOINT, envelope);
    },

    /**
     * Add or Edit Product GL Interface mappings.
     * Stored procedure: dbo.p_AddEditGLInterface
     * RequestData shape:
     *   {
     *     BankID: "BankID",
     *     RelevantID: "nvarchar",   // e.g. ProductID
     *     ModuleID: "smallint",     // e.g. 2507 for Product GL Interface
     *     OperatedBy: "OperatorID",
     *     UpdateCount: "tinyint",
     *     OperatedOn: "smalldatetime", // MM/DD/YYYY HH:MM:SS
     *     SupervisedBy: "OperatorID",
     *     DetailRecords: "xml"
     *   }
     */
    addEditGLInterface(requestData) {
      const formId = "dbo.p_AddEditGLInterface";

      const formatLegacyRequestTime = (d = new Date()) => {
        const pad2 = (n) => String(n).padStart(2, "0");
        const mm = pad2(d.getMonth() + 1);
        const dd = pad2(d.getDate());
        const yyyy = d.getFullYear();
        const hh = pad2(d.getHours());
        const mi = pad2(d.getMinutes());
        const ss = pad2(d.getSeconds());
        return `${mm}/${dd}/${yyyy} ${hh}:${mi}:${ss}`;
      };

      const envelope = CoreApi.makeRequestEnvelope(formId, requestData, Environment.appName || "PROJECT_KAIRO");

      try {
        const debug = global.__CORE_API_DEBUG__ === true || global.localStorage?.getItem?.("coreApiDebug") === "1";
        if (debug) {
          console.groupCollapsed("[ProductLgLcService] addEditGLInterface");
          console.info("Endpoint", PRODUCT_ENDPOINT);
          console.info("RequestData", requestData);
          console.info("Envelope", envelope);
          console.groupEnd();
        } else {
          console.log("[ProductLgLcService] addEditGLInterface calling", formId, requestData);
        }
      } catch {
        // ignore logging errors
      }

      // Align with legacy request contract expected by OldAPI
      envelope.RequestID = formId;
      envelope.FormID = formId;
      envelope.FormId = formId;
      envelope.RequestTime = formatLegacyRequestTime();

      return CoreApi.post(PRODUCT_ENDPOINT, envelope);
    },

    /**
     * Delete Product GL Interface mappings.
     * Stored procedure: dbo.p_DeleteGLInterface
     * RequestData shape:
     *   {
     *     BankID: "BankID",
     *     RelevantID: "nvarchar", // e.g. ProductID
     *     ModuleID: "smallint",   // e.g. 2507 for Product GL Interface
     *     UpdateCount: "tinyint"
     *   }
     */
    deleteGLInterface(requestData) {
      const formId = "dbo.p_DeleteGLInterface";

      const formatLegacyRequestTime = (d = new Date()) => {
        const pad2 = (n) => String(n).padStart(2, "0");
        const mm = pad2(d.getMonth() + 1);
        const dd = pad2(d.getDate());
        const yyyy = d.getFullYear();
        const hh = pad2(d.getHours());
        const mi = pad2(d.getMinutes());
        const ss = pad2(d.getSeconds());
        return `${mm}/${dd}/${yyyy} ${hh}:${mi}:${ss}`;
      };

      const envelope = CoreApi.makeRequestEnvelope(formId, requestData, Environment.appName || "PROJECT_KAIRO");

      try {
        const debug = global.__CORE_API_DEBUG__ === true || global.localStorage?.getItem?.("coreApiDebug") === "1";
        if (debug) {
          console.groupCollapsed("[ProductLgLcService] deleteGLInterface");
          console.info("Endpoint", PRODUCT_ENDPOINT);
          console.info("RequestData", requestData);
          console.info("Envelope", envelope);
          console.groupEnd();
        } else {
          console.log("[ProductLgLcService] deleteGLInterface calling", formId, requestData);
        }
      } catch {
        // ignore logging errors
      }

      envelope.RequestID = formId;
      envelope.FormID = formId;
      envelope.FormId = formId;
      envelope.RequestTime = formatLegacyRequestTime();

      return CoreApi.post(PRODUCT_ENDPOINT, envelope);
    },

    /**
     * Get Product Charges.
     * Stored procedure: dbo.p_GetProductCharge
     * @param {object} requestData - { OurBranchID, OperatorID, ProductID }
     */
    getProductCharge(requestData) {
      const formId = "dbo.p_GetProductCharge";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(PRODUCT_ENDPOINT, envelope);
    },

    /**
     * Get Search Results.
     * Stored procedure: dbo.p_GetSearchResult
     * @param {object} requestData - { TableID, AdvFilterString, WhereStmt, PrevOrNext, RefID, OperatorID, ModuleID, OurBranchID, SearchKey, LanguageID }
     */
    getSearchResult(requestData) {
      const formId = "dbo.p_GetSearchResult";

      const formatLegacyRequestTime = (d = new Date()) => {
        const pad2 = (n) => String(n).padStart(2, "0");
        const mm = pad2(d.getMonth() + 1);
        const dd = pad2(d.getDate());
        const yyyy = d.getFullYear();
        const hh = pad2(d.getHours());
        const mi = pad2(d.getMinutes());
        const ss = pad2(d.getSeconds());
        return `${mm}/${dd}/${yyyy} ${hh}:${mi}:${ss}`;
      };

      const envelope = CoreApi.makeRequestEnvelope(formId, requestData, Environment.appName || "PROJECT_KAIRO");

      try {
        const debug = global.__CORE_API_DEBUG__ === true || global.localStorage?.getItem?.("coreApiDebug") === "1";
        if (debug) {
          console.groupCollapsed("[ProductLgLcService] getSearchResult");
          console.info("Endpoint", PRODUCT_ENDPOINT);
          console.info("RequestData", requestData);
          console.info("Envelope", envelope);
          console.groupEnd();
        }
      } catch {
        // ignore logging errors
      }

      // Align with required OldAPI search contract
      envelope.RequestID = formId;
      envelope.FormID = formId;
      envelope.FormId = formId;
      envelope.RequestTime = formatLegacyRequestTime();

      return CoreApi.post(PRODUCT_ENDPOINT, envelope);
    },

    /**
     * Add or Edit Product Accounting Rule Details (with XML).
     * Stored procedure: dbo.p_AddEditProductAcRuleDetail
     * @param {object} requestData - { BankID, AcRuleID, EventID, OperatedBy, OperatedOn, SupervisedBy, UpdateCount, DetailRecords (XML) }
     */
    addEditProductAcRuleDetail(requestData) {
      const formId = "dbo.p_AddEditProductAcRuleDetail";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(PRODUCT_ENDPOINT, envelope);
    },

    /**
     * Get Product Accounting Rule Transaction Details.
     * Stored procedure: dbo.p_GetProductAcRuleTrx
     * @param {object} requestData - { BankID, ProductID, EventID, Module }
     */
    getProductAcRuleTrx(requestData) {
      const formId = "dbo.p_GetProductAcRuleTrx";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(PRODUCT_ENDPOINT, envelope);
    },

    /**
     * Edit Product Charges.
     * Stored procedure: dbo.p_EditProductCharge
     * RequestData shape:
     *   {
     *     XMLData: "xml",
     *     OperatorID: "OperatorID"
     *   }
     */
    editProductCharge(requestData) {
      const formId = "dbo.p_EditProductCharge";

      const formatLegacyRequestTime = (d = new Date()) => {
        const pad2 = (n) => String(n).padStart(2, "0");
        const mm = pad2(d.getMonth() + 1);
        const dd = pad2(d.getDate());
        const yyyy = d.getFullYear();
        const hh = pad2(d.getHours());
        const mi = pad2(d.getMinutes());
        const ss = pad2(d.getSeconds());
        return `${mm}/${dd}/${yyyy} ${hh}:${mi}:${ss}`;
      };

      const envelope = CoreApi.makeRequestEnvelope(formId, requestData, Environment.appName || "PROJECT_KAIRO");

      try {
        const debug = global.__CORE_API_DEBUG__ === true || global.localStorage?.getItem?.("coreApiDebug") === "1";
        if (debug) {
          console.groupCollapsed("[ProductLgLcService] editProductCharge");
          console.info("Endpoint", PRODUCT_ENDPOINT);
          console.info("RequestData", requestData);
          console.info("Envelope", envelope);
          console.groupEnd();
        } else {
          console.log("[ProductLgLcService] editProductCharge calling", formId, requestData);
        }
      } catch {
        // ignore logging errors
      }

      // Align with legacy request contract expected by OldAPI
      envelope.RequestID = formId;
      envelope.FormID = formId;
      envelope.FormId = formId;
      envelope.RequestTime = formatLegacyRequestTime();

      return CoreApi.post(PRODUCT_ENDPOINT, envelope);
    }
  };

  global.ProductLgLcService = ProductLgLcService;
})(window);
