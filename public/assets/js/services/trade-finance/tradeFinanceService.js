(function (global) {
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};

  const resolveOldApiEndpoint = () => {
    try {
      if (Environment.useLocalOldApiProxy === true) return '/api/OldAPI';
      const base = (Environment.baseUrlLCApplication || Environment.baseUrlCommon || "").toString().replace(/\/+$/, "");
      return base ? `${base}/api/OldAPI` : '/api/OldAPI';
    } catch {
      return '/api/OldAPI';
    }
  };

  const LCApplicationService = {
    /**
     * Get LC Account Application.
     * RequestData:
     * {
     *   ApplicationID: "ApplicationID",
     *   OurBranchID: "BranchID",
     *   OperatorID: "OperatorID",
     *   Direction: "smallint",
     *   BankID: "BankID"
     * }
     */
    getLCApplication(requestData) {
      const formId = "dbo.p_GetLCAccountApplication";

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

      // Use CoreApi for consistent formatting, then align with legacy sample if required.
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData, "PROJECT_KAIRO");

      // Some legacy integrations expect RequestID to exactly match FormId/FormID.
      envelope.RequestID = formId;

      // Ensure FormID is set to the stored procedure.
      envelope.FormID = formId;

      // Sample payload shows FormId (lowercase d). Keep both keys for maximum compatibility.
      envelope.FormId = formId;

      // Sample payload uses legacy RequestTime format (MM/DD/YYYY HH:mm:ss).
      envelope.RequestTime = formatLegacyRequestTime();

      try {
        const debug = global.__CORE_API_DEBUG__ === true || global.localStorage?.getItem?.('coreApiDebug') === '1';
        if (debug) {
          console.groupCollapsed('[LCApplicationService] getLCApplication');
          console.info('Endpoint', LC_APPLICATION_ENDPOINT);
          console.info('RequestData', requestData);
          console.info('Envelope', envelope);
          console.groupEnd();
        }
      } catch {
        // ignore
      }

      return CoreApi.post(resolveOldApiEndpoint(), envelope);
    },

    /**
     * Search for records.
     * RequestData:
     * {
     *   TableID: "tableName",
     *   AdvFilterString: "",
     *   WhereStmt: "columnName like '%searchValue%'",
     *   PrevOrNext: "1",
     *   RefID: "",
     *   OperatorID: "operatorId",
     *   ModuleID: 1000,
     *   OurBranchID: "branchId",
     *   SearchKey: "",
     *   LanguageID: "en"
     * }
     */
    search(requestData) {
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
      
      // Use CoreApi for consistent formatting, then align with legacy sample
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData, "PROJECT_KAIRO");

      // Some legacy integrations expect RequestID to exactly match FormId/FormID
      envelope.RequestID = formId;
      envelope.FormID = formId;
      envelope.FormId = formId;

      // Legacy RequestTime format (MM/DD/YYYY HH:mm:ss)
      envelope.RequestTime = formatLegacyRequestTime();

      try {
        const debug = global.__CORE_API_DEBUG__ === true || global.localStorage?.getItem?.('coreApiDebug') === '1';
        if (debug) {
          console.groupCollapsed('[tradeFinanceService] search');
          console.info('Endpoint', resolveOldApiEndpoint());
          console.info('RequestData', requestData);
          console.info('Envelope', envelope);
          console.groupEnd();
        }
      } catch {
        // ignore
      }

      return CoreApi.post(resolveOldApiEndpoint(), envelope);
    },

    /**
     * Get LC Bank Details.
     * RequestData:
     * {
     *   ApplicationID: "ApplicationID",
     *   OurBranchID: "BranchID",
     *   OperatorID: "OperatorID"
     * }
     */
    getLCBankDetails(requestData) {
      const formId = "dbo.p_GetLCBankDetails";

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

      const envelope = CoreApi.makeRequestEnvelope(formId, requestData, "PROJECT_KAIRO");

      envelope.RequestID = formId;
      envelope.FormID = formId;
      envelope.FormId = formId;
      envelope.RequestTime = formatLegacyRequestTime();

      try {
        const debug = global.__CORE_API_DEBUG__ === true || global.localStorage?.getItem?.("coreApiDebug") === "1";
        if (debug) {
          console.groupCollapsed("[tradeFinanceService] getLCBankDetails");
          console.info("Endpoint", resolveOldApiEndpoint());
          console.info("RequestData", requestData);
          console.info("Envelope", envelope);
          console.groupEnd();
        }
      } catch {
        // ignore
      }

      return CoreApi.post(resolveOldApiEndpoint(), envelope);
    },

    /**
     * Get LC More Info.
     * RequestData:
     * {
     *   ApplicationID: "ApplicationID",
     *   OurBranchID: "BranchID",
     *   OperatorID: "OperatorID"
     * }
     */
    getLCMoreInfo(requestData) {
      const formId = "dbo.p_GetLCMoreInfo";

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

      const envelope = CoreApi.makeRequestEnvelope(formId, requestData, "PROJECT_KAIRO");

      envelope.RequestID = formId;
      envelope.FormID = formId;
      envelope.FormId = formId;
      envelope.RequestTime = formatLegacyRequestTime();

      try {
        const debug = global.__CORE_API_DEBUG__ === true || global.localStorage?.getItem?.("coreApiDebug") === "1";
        if (debug) {
          console.groupCollapsed("[tradeFinanceService] getLCMoreInfo");
          console.info("Endpoint", resolveOldApiEndpoint());
          console.info("RequestData", requestData);
          console.info("Envelope", envelope);
          console.groupEnd();
        }
      } catch {
        // ignore
      }

      return CoreApi.post(resolveOldApiEndpoint(), envelope);
    },

    /**
     * Search System Branches.
     * RequestData:
     * {
     *   BankID: "BankID"
     * }
     */
    searchBranches(requestData) {
      const formId = "dbo.pc_SearchSystemBranches";

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

      const envelope = CoreApi.makeRequestEnvelope(formId, requestData, "PROJECT_KAIRO");

      envelope.RequestID = formId;
      envelope.FormID = formId;
      envelope.FormId = formId;
      envelope.RequestTime = formatLegacyRequestTime();

      try {
        const debug = global.__CORE_API_DEBUG__ === true || global.localStorage?.getItem?.("coreApiDebug") === "1";
        if (debug) {
          console.groupCollapsed("[tradeFinanceService] searchBranches");
          console.info("Endpoint", resolveOldApiEndpoint());
          console.info("RequestData", requestData);
          console.info("Envelope", envelope);
          console.groupEnd();
        }
      } catch {
        // ignore
      }

      return CoreApi.post(resolveOldApiEndpoint(), envelope);
    },

    /**
     * Search Currencies.
     * RequestData: {} (empty object, retrieves all currencies)
     */
    searchCurrencies(requestData = {}) {
      const formId = "dbo.pc_SearchCurrencies";

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

      const envelope = CoreApi.makeRequestEnvelope(formId, requestData, "PROJECT_KAIRO");

      envelope.RequestID = formId;
      envelope.FormID = formId;
      envelope.FormId = formId;
      envelope.RequestTime = formatLegacyRequestTime();

      try {
        const debug = global.__CORE_API_DEBUG__ === true || global.localStorage?.getItem?.("coreApiDebug") === "1";
        if (debug) {
          console.groupCollapsed("[tradeFinanceService] searchCurrencies");
          console.info("Endpoint", resolveOldApiEndpoint());
          console.info("RequestData", requestData);
          console.info("Envelope", envelope);
          console.groupEnd();
        }
      } catch {
        // ignore
      }

      return CoreApi.post(resolveOldApiEndpoint(), envelope);
    },

    /**
     * Get Countries.
     * RequestData:
     * {
     *   CountryID: "nvarchar"
     * }
     */
    getCountries(requestData = {}) {
      const formId = "dbo.p_GetCountries";

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

      const envelope = CoreApi.makeRequestEnvelope(formId, requestData, "PROJECT_KAIRO");

      envelope.RequestID = formId;
      envelope.FormID = formId;
      envelope.FormId = formId;
      envelope.RequestTime = formatLegacyRequestTime();

      try {
        const debug = global.__CORE_API_DEBUG__ === true || global.localStorage?.getItem?.("coreApiDebug") === "1";
        if (debug) {
          console.groupCollapsed("[tradeFinanceService] getCountries");
          console.info("Endpoint", resolveOldApiEndpoint());
          console.info("RequestData", requestData);
          console.info("Envelope", envelope);
          console.groupEnd();
        }
      } catch {
        // ignore
      }

      return CoreApi.post(resolveOldApiEndpoint(), envelope);
    },

    /**
     * Add/Edit LC More Details.
     * RequestData:
     * {
     *   ApplicationID, OurBranchID, DescriptionOfGoods, Revocable, IRevocable,
     *   Revolving, Confirmed, Transferable, TransShipment, PartialShipment,
     *   CountryOfOrigin, ShipmentBy, ShipmentFrom, ShipmentTo, ShipmentMarks,
     *   ShipmentDate, LastdateAllowedforShipment, CreatedBy, ModifiedBy, 
     *   SupervisedBy, UpdateCount
     * }
     */
    addEditLCMoreInfo(requestData) {
      const formId = "dbo.p_AddEditLCMoreDetails";

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

      const envelope = CoreApi.makeRequestEnvelope(formId, requestData, "PROJECT_KAIRO");

      envelope.RequestID = formId;
      envelope.FormID = formId;
      envelope.FormId = formId;
      envelope.RequestTime = formatLegacyRequestTime();

      try {
        const debug = global.__CORE_API_DEBUG__ === true || global.localStorage?.getItem?.("coreApiDebug") === "1";
        if (debug) {
          console.groupCollapsed("[tradeFinanceService] addEditLCMoreInfo");
          console.info("Endpoint", resolveOldApiEndpoint());
          console.info("RequestData", requestData);
          console.info("Envelope", envelope);
          console.groupEnd();
        }
      } catch {
        // ignore
      }

      return CoreApi.post(resolveOldApiEndpoint(), envelope);
    },

    /**
     * Add or Edit LC Account Application.
     * RequestData:
     * {
     *   OurBranchID: "BranchID",
     *   ApplicationID: "ApplicationID",
     *   ApplicationDate: "datetime",
     *   AccountID: "AccountID",
     *   ClientID: "ClientID",
     *   ProductID: "ProductID",
     *   PurposeID: "UserSubID",
     *   ReferenceNumber: "varchar",
     *   LimitAmount: "Amount",
     *   ExpiryDate: "smalldatetime",
     *   Remarks: "Remarks",
     *   ApplStatusID: "SystemSubID",
     *   ExchangeRate: "money",
     *   LocalAmount: "money",
     *   CreatedBy: "OperatorID",
     *   CreatedOn: "smalldatetime",
     *   ModifiedBy: "OperatorID",
     *   ModifiedOn: "smalldatetime",
     *   SupervisedBy: "OperatorID",
     *   SupervisedOn: "smalldatetime",
     *   UpdateCount: "tinyint",
     *   SerialID: "int",
     *   NextKeyID: "varchar"
     * }
     */
    addEditLCApplication(requestData) {
      const formId = "dbo.p_AddEditLCAccountApplication";

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

      const envelope = CoreApi.makeRequestEnvelope(formId, requestData, "PROJECT_KAIRO");

      envelope.RequestID = formId;
      envelope.FormID = formId;
      envelope.FormId = formId;
      envelope.RequestTime = formatLegacyRequestTime();

      try {
        const debug = global.__CORE_API_DEBUG__ === true || global.localStorage?.getItem?.("coreApiDebug") === "1";
        if (debug) {
          console.groupCollapsed("[tradeFinanceService] addEditLCApplication");
          console.info("Endpoint", resolveOldApiEndpoint());
          console.info("RequestData", requestData);
          console.info("Envelope", envelope);
          console.groupEnd();
        }
      } catch {
        // ignore
      }

      return CoreApi.post(resolveOldApiEndpoint(), envelope);
    },

    /**
     * Delete LC More Details.
     * RequestData:
     * {
     *   ApplicationID: "ApplicationID",
     *   OurBranchID: "BranchID",
     *   OperatorID: "OperatorID"
     * }
     */
    deleteLCMoreInfo(requestData) {
      const formId = "dbo.p_DeleteLCMoreDetails";

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

      const envelope = CoreApi.makeRequestEnvelope(formId, requestData, "PROJECT_KAIRO");

      envelope.RequestID = formId;
      envelope.FormID = formId;
      envelope.FormId = formId;
      envelope.RequestTime = formatLegacyRequestTime();

      try {
        const debug = global.__CORE_API_DEBUG__ === true || global.localStorage?.getItem?.("coreApiDebug") === "1";
        if (debug) {
          console.groupCollapsed("[tradeFinanceService] deleteLCMoreInfo");
          console.info("Endpoint", resolveOldApiEndpoint());
          console.info("RequestData", requestData);
          console.info("Envelope", envelope);
          console.groupEnd();
        }
      } catch {
        // ignore
      }

      return CoreApi.post(resolveOldApiEndpoint(), envelope);
    },

    /**
     * Add or Edit LC Bank Details.
     * RequestData:
     * {
     *   ApplicationID: "ApplicationID",
     *   OurBranchID: "BranchID",
     *   DetailRecords: "xml",
     *   CreatedBy: "OperatorID",
     *   CreatedOn: "smalldatetime",
     *   ModifiedBy: "OperatorID",
     *   ModifiedOn: "smalldatetime",
     *   SupervisedBy: "OperatorID",
     *   SupervisedOn: "smalldatetime",
     *   UpdateCount: "tinyint"
     * }
     */
    addEditLCBankDetails(requestData) {
      const formId = "dbo.p_AddEditLCBankDetails";

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

      const envelope = CoreApi.makeRequestEnvelope(formId, requestData, "PROJECT_KAIRO");

      envelope.RequestID = formId;
      envelope.FormID = formId;
      envelope.FormId = formId;
      envelope.RequestTime = formatLegacyRequestTime();

      try {
        const debug = global.__CORE_API_DEBUG__ === true || global.localStorage?.getItem?.("coreApiDebug") === "1";
        if (debug) {
          console.groupCollapsed("[tradeFinanceService] addEditLCBankDetails");
          console.info("Endpoint", resolveOldApiEndpoint());
          console.info("RequestData", requestData);
          console.info("Envelope", envelope);
          console.groupEnd();
        }
      } catch {
        // ignore
      }

      return CoreApi.post(resolveOldApiEndpoint(), envelope);
    },

    /**
     * Get Contract Registration.
     * RequestData:
     * {
     *   OurBranchID: "BranchID",
     *   ContractNumber: "nvarchar"
     * }
     */
    getContractRegistration(requestData) {
      const formId = "dbo.p_GetContractRegistration";

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

      const envelope = CoreApi.makeRequestEnvelope(formId, requestData, "PROJECT_KAIRO");

      envelope.RequestID = formId;
      envelope.FormID = formId;
      envelope.FormId = formId;
      envelope.RequestTime = formatLegacyRequestTime();

      try {
        const debug = global.__CORE_API_DEBUG__ === true || global.localStorage?.getItem?.("coreApiDebug") === "1";
        if (debug) {
          console.groupCollapsed("[tradeFinanceService] getContractRegistration");
          console.info("Endpoint", resolveOldApiEndpoint());
          console.info("RequestData", requestData);
          console.info("Envelope", envelope);
          console.groupEnd();
        }
      } catch {
        // ignore
      }

      return CoreApi.post(resolveOldApiEndpoint(), envelope);
    }
    ,

    /**
     * Add/Edit Contract Registration.
     * RequestData:
     * {
     *   OurBranchID: "BranchID",
     *   ClientID: "ClientID",
     *   OperatorID: "OperatorID",
     *   RegistrationDtls: "nvarchar"
     * }
     */
    addContractRegistration(requestData) {
      const formId = "dbo.p_AddContractRegistration";

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

      const envelope = CoreApi.makeRequestEnvelope(formId, requestData, "PROJECT_KAIRO");

      envelope.RequestID = formId;
      envelope.FormID = formId;
      envelope.FormId = formId;
      envelope.RequestTime = formatLegacyRequestTime();

      try {
        const debug = global.__CORE_API_DEBUG__ === true || global.localStorage?.getItem?.("coreApiDebug") === "1";
        if (debug) {
          console.groupCollapsed("[tradeFinanceService] addContractRegistration");
          console.info("Endpoint", resolveOldApiEndpoint());
          console.info("RequestData", requestData);
          console.info("Envelope", envelope);
          console.groupEnd();
        }
      } catch {
        // ignore
      }

      return CoreApi.post(resolveOldApiEndpoint(), envelope);
    }
  };

  global.tradeFinanceService = LCApplicationService;
})(window);
