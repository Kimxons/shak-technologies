(function (global) {
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};

  if (!CoreApi) {
    console.error("CoreApi is not loaded. Ensure services/shared/coreApi.js is included before lookupService.js.");
    return;
  }

  // Per project convention, route OldAPI calls through baseUrlCommon when available.
  // Fallback to baseUrlSystemCodes for older deployments.
  const SYSTEM_CODES_BASE_URL = (
    Environment.baseUrl ||
    Environment.baseUrlCommon ||
    Environment.baseUrlSystemCodes ||
    "http://172.16.2.31:3306"
  ).replace(/\/+$/, "");

  // Optional overrides for system-code IDs (lets backend differ by env without UI hardcoding)
  // Example:
  // Environment.systemCodeIds = { groupTypes: "GroupTypeID", meetingDays: "MeetingDayID" }
  const SYSTEM_CODE_ID_OVERRIDES = Environment.systemCodeIds || Environment.systemCodes || {};
  const resolveCodeId = (key, fallback) => SYSTEM_CODE_ID_OVERRIDES[key] || fallback;

  const endpoints = {
    getSystemCode: `${SYSTEM_CODES_BASE_URL}/api/OldAPI`,
    getSystemSearch: `${SYSTEM_CODES_BASE_URL}/api/OldAPI`,
  };

  const cache = new Map();

  const mapSystemCodeDetails = (details = []) =>
    details.map((row) => {
      // Case-insensitive field lookup helper
      const getField = (obj, ...keys) => {
        for (const key of keys) {
          const lowerKey = key.toLowerCase();
          const actualKey = Object.keys(obj).find(k => k.toLowerCase() === lowerKey);
          if (actualKey && obj[actualKey] != null) return obj[actualKey];
        }
        return null;
      };

      return {
        value: getField(row, 'SubCodeID', 'subcodeid', 'SubCode', 'Value', 'ID', 'CodeID') || '',
        label: getField(row, 'CodeDescription', 'codedescription', 'Description', 'Label', 'Name') || '',
        order: getField(row, 'DisplayOrder', 'displayorder', 'Order', 'SortOrder') ?? 0
      };
    })
      .sort((a, b) => a.order - b.order);

  /**
   * Get system code options with caching
   * @param {string} codeId - The system code identifier (e.g., "ClientTypeID")
   * @returns {Promise<Array>} Array of { value, label, order } objects
   */
  async function getSystemCodeOptions(codeId) {
    const cacheKey = `code:${codeId}`;
    if (cache.has(cacheKey)) {
      console.log(`[LookupService] Cache hit for ${codeId}`);
      return cache.get(cacheKey);
    }

    const requestData = { CodeID: codeId };
    const envelope = CoreApi.makeRequestEnvelope("p_v1_GetSystemCodes", requestData);

    try {
      const response = await CoreApi.post(endpoints.getSystemCode, envelope);

      console.log(`[LookupService] Response for ${codeId}:`, response);

      console.log(`[LookupService] Raw response for ${codeId}:`, response);

      if (!response.success) {
        console.error("SystemCode lookup failed for", codeId, response.message);
        return [];
      }

      // Handle various response structures
      let rows = response.data || response.Details || response.Details01 || [];

      // If data is nested (e.g., response.data.Details or response.data.Details01)
      if (rows && rows.Details) {
        rows = rows.Details;
      } else if (rows && rows.Details01) {
        rows = rows.Details01;
      }

      console.log(`[LookupService] Rows for ${codeId}:`, rows);

      // Log first row structure for debugging
      if (Array.isArray(rows) && rows.length > 0) {
        console.log(`[LookupService] First row keys for ${codeId}:`, Object.keys(rows[0]));
      }

      const options = mapSystemCodeDetails(Array.isArray(rows) ? rows : [rows]);
      console.log(`[LookupService] Mapped options for ${codeId}:`, options);

      cache.set(cacheKey, options);
      return options;
    } catch (error) {
      console.error("SystemCode lookup failed for", codeId, error);
      return [];
    }
  }

  class LookupService {
    /**
     * Get system code options (cached)
     * @param {string} codeId
     * @returns {Promise<Array<{value:string,label:string,order:number}>>}
     */
    async getSystemCodeOptions(codeId) {
      return getSystemCodeOptions(codeId);
    }

    /**
     * Get system code/lookup data (direct API call)
     * @param {object} requestData - { CodeID, etc. }
     * @returns {Promise} Normalized response
     */
    getSystemCode(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("p_v1_GetSystemCodes", requestData);
      return CoreApi.post(endpoints.getSystemCode, envelope);
    }

    /**
     * Get system code options with caching
     * @param {string} codeId - The system code identifier (e.g., "ClientTypeID")
     * @returns {Promise<Array>} Array of { value, label, order } objects
     */
    async getSystemCodeOptions(codeId) {
      return getSystemCodeOptions(codeId);
    }

    /**
     * Search/lookup functionality
     * @param {object} requestData - Search criteria { SearchTerm, Module, etc. }
     * @returns {Promise} Normalized response
     */
    getSystemSearch(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("p_v1_GetSystemSearchResult", requestData);
      return CoreApi.post(endpoints.getSystemSearch, envelope);
    }

    // Specific lookup methods with caching
    async getClientTypes() {
      return getSystemCodeOptions("ClientTypeID");
    }

    async getTitles() {
      return getSystemCodeOptions("TitleID");
    }

    async getGenders() {
      return getSystemCodeOptions("GenderID");
    }

    async getLiteracyLevels() {
      return getSystemCodeOptions("LiteracyLevelID");
    }

    async getMaritalStatuses() {
      return getSystemCodeOptions("MaritalStatusID");
    }

    async getIdentificationTypes() {
      return getSystemCodeOptions("IdentificationTypeID");
    }

     async getAllocationTypes() {
      return getSystemCodeOptions("AllocationTypeID");
    }

    async getScoreClassifications() {
      return getSystemCodeOptions("ScoreClassificationID");
    }

    async getScoreDecisions() {
      return getSystemCodeOptions("ScoreDecisionID");
    }

    async getResidentStatuses() {
      return getSystemCodeOptions("ResidentID");
    }

    async getCancelPaymentReasons() {
      return getSystemCodeOptions("CancelPaymentID");
    }

    async getTransferTypes() {
      return getSystemCodeOptions("TransferTypeID");
    }

    async getRelationshipManagers() {
      return getSystemCodeOptions("RelationshipManagerID");
    }

    async getRelations() {
      return getSystemCodeOptions("RelationID");
    }

    async getRelationTypes() {
      return getSystemCodeOptions(resolveCodeId("relationTypes", "RelationTypeID"));
    }

    async getCountries() {



      return getSystemCodeOptions("CountryID");
    }

    async getCities() {
      return getSystemCodeOptions("CityID");
    }

    async getBloodGroups() {
      return getSystemCodeOptions("BloodGroupID");
    }

    async getDepartments() {
      return getSystemCodeOptions("DepartmentID");
    }

    async getSections() {
      return getSystemCodeOptions("SectionID");
    }

    async getIndustries() {
      return getSystemCodeOptions("IndustryID");
    }

    async getRegions() {
      return getSystemCodeOptions("RegionID");
    }

    async getSubCityZones() {
      return getSystemCodeOptions("SubCityID");
    }

    async getSectors() {
      return getSystemCodeOptions("SectorID");
    } 
    async getDocumentTypes() {
      return getSystemCodeOptions("DocumentTypeID");
    }

    async getDocumentClasses() {
      return getSystemCodeOptions("DocumentClassID");
    }

    async getSubSectors() {
      return getSystemCodeOptions("SubSectorID");
    }

    async getLanguages() {
      return getSystemCodeOptions("LanguageID");
    }
     async getAccountCloseReasons() {
      return getSystemCodeOptions("AccountCloseReasonID");
    }

    async getOccupations() {
      return getSystemCodeOptions("OccupationID");
    }

    async getDesignations() {
      return getSystemCodeOptions("DesignationID");
    }

    async getCompanyTypes() {
      return getSystemCodeOptions("CompanyTypeID");
    }

    async getSignatoryTypes() {
      return getSystemCodeOptions("SignatoryTypeID");
    }

    async getMandates() {
      return getSystemCodeOptions("AgentMandateID");
    }

    async getInstitutionTypes() {
      return getSystemCodeOptions("InstitutionTypeID");
    }

    async getGroupTypes() {
      return getSystemCodeOptions(resolveCodeId("groupTypes", "GroupTypeID"));
    }

    async getGuarantorTypes() {
      return getSystemCodeOptions("GuarantorClientTypeID");
    }

    async getMeetingDays() {
      return getSystemCodeOptions(resolveCodeId("meetingDays", "MeetingDayID"));
    }

    async getContributionCycles() {
      return getSystemCodeOptions(resolveCodeId("contributionCycles", "ContributionCycleID"));
    }

    async getBusinessOwnerships() {
      return getSystemCodeOptions("BusinessOwnershipID");
    }

    async getBusinessLines() {
      return getSystemCodeOptions("BusinessLineID");
    }

    async getLoanPurposes() {
      return getSystemCodeOptions("PurposeCodeID");
    }

    async getBusinessStatuses() {
      return getSystemCodeOptions("BusinessStatus");
    }

    async getCollateralTypes() {
      return getSystemCodeOptions("CollateralType");
    }

    async getStartupTypes() {
      return getSystemCodeOptions("StartupType");
    }

    async getLimitTypes() {
      return getSystemCodeOptions("LimitTypeID");
    }

    async getAddressTypes() {
      return getSystemCodeOptions("AddressTypeID");
    }

    async getUtilizationTypes() {
      return getSystemCodeOptions("UtilizeTypeID");
    }

    async getAccessLevels() {
      return getSystemCodeOptions("AccessLevelID");
    }
    async getAccountTypeID() {
      return getSystemCodeOptions("AccountTypeID");
    }

    async getTransferTypeID() {
      return getSystemCodeOptions("TransferTypeID");
    }

    async getInstrumentTypeID() {
      return getSystemCodeOptions("InstrumentTypeID");
    }

    async getLiqudationOption() {
      return getSystemCodeOptions("LiqudationOption");
    }

    /**
     * Generic method to get any system code options
     * @param {string} codeId - The system code identifier
     * @returns {Promise<Array>} Array of { value, label, order } objects
     */
    async getSystemCodeOptions(codeId) {
      return getSystemCodeOptions(codeId);
    }

    async getDocuments() {
      return getSystemCodeOptions("DocumentID");
    }

    async getDocumentTypes() {
      return getSystemCodeOptions("DocumentTypeID");
    }

    async getDocumentLocations() {
      return getSystemCodeOptions("DocumentLocationID");
    }

    async getDepreciationMethods() {
      return getSystemCodeOptions("DepreciationMethodID");
    }

    async getDepreciationRateTypes() {
      return getSystemCodeOptions("DepreciationRateTypeID");
    }

    async getAcquisitionTypes() {
      return getSystemCodeOptions("AcquisitionByID");
    }

    async getRevaluationTypes() {
      return getSystemCodeOptions("RevaluationTypeID");
    }

    async getSystemColors() {
      return getSystemCodeOptions("ColorID");
    }

      async getBaseRateTypes() {
      return getSystemCodeOptions("BaseRateTypeID");
    }

    async getDepreciationFrequencies() {
      const options = await getSystemCodeOptions("CompFrequencyID");
      if (options && options.length > 0) return options;

      return [
        { value: "MTH", label: "Monthly", order: 1 },
        { value: "QTR", label: "Quarterly", order: 2 },
        { value: "HLF", label: "Half Yearly", order: 3 },
        { value: "YLY", label: "Yearly", order: 4 }
      ];
    }

    // Client Maintenance (Other Details / KYC) lookups
    async getClientAreas() {
      return getSystemCodeOptions(resolveCodeId("clientAreas", "ClientArea"));
    }

    async getPersonalStatuses() {
      return getSystemCodeOptions(resolveCodeId("personalStatuses", "PersonalStatusID"));
    }

    async getCloseLawSuits() {
      return getSystemCodeOptions(resolveCodeId("closeLawSuits", "CloseLawSuitID"));
    }

    async getCnfsoStatuses() {
      return getSystemCodeOptions(resolveCodeId("cnfsoStatuses", "CNFSO"));
    }

    async getOperatingModes() {
      return getSystemCodeOptions("OperatingModeID");
    }

    async getSecurityTypes() {
      return getSystemCodeOptions("SecurityTypeID");
    }

    async getTreasuryTypes() {
      return getSystemCodeOptions("TreasuryTypeID");
    }
    async getSecurityCategories() {
      return getSystemCodeOptions("SecurityCategory");
    }

    async getRedemptionTypes() {
      return getSystemCodeOptions("RedeemType");
    }

    async getMoneyMarketTypes() {
      return getSystemCodeOptions("MoneyMarketTypeID");
    }

    async getMoneyMarketPurposes() {
      return getSystemCodeOptions("MoneyMarketPurposeID");
    }

    async getBuySellTypes() {
      return getSystemCodeOptions("BuySellID");
    }

    async getSignatoryTypes() {
      return getSystemCodeOptions("SignatoryTypeID");
    }

    async getBookTypes() {
      // Get book types with isActive filter
      const codeId = "BookTypeID";
      const cacheKey = `code:${codeId}:active`;
      
      if (cache.has(cacheKey)) {
        console.log(`[LookupService] Cache hit for ${codeId} (active only)`);
        return cache.get(cacheKey);
      }

      const requestData = { CodeID: codeId };
      const envelope = CoreApi.makeRequestEnvelope("p_v1_GetSystemCodes", requestData);

      try {
        const response = await CoreApi.post(endpoints.getSystemCode, envelope);
        console.log(`[LookupService] Response for ${codeId}:`, response);

        if (!response.success) {
          console.error("SystemCode lookup failed for", codeId, response.message);
          return [];
        }

        let rows = response.data || response.Details || response.Details01 || [];
        if (rows && rows.Details) {
          rows = rows.Details;
        } else if (rows && rows.Details01) {
          rows = rows.Details01;
        }

        // Filter by isActive = 1
        if (Array.isArray(rows)) {
          rows = rows.filter(row => {
            const isActive = row.isActive ?? row.IsActive ?? row.ISACTIVE ?? 1;
            return isActive === 1 || isActive === '1' || isActive === true;
          });
        }

        console.log(`[LookupService] Filtered active rows for ${codeId}:`, rows);

        const options = mapSystemCodeDetails(Array.isArray(rows) ? rows : [rows]);
        cache.set(cacheKey, options);
        return options;
      } catch (error) {
        console.error("SystemCode lookup failed for", codeId, error);
        return [];
      }
    }

    async getClientPortfolioTypes() {
      return getSystemCodeOptions("ClientPortfolioType");
    }

    async getBlockedReasons() {
      return getSystemCodeOptions("BlockedReasonID");
    }

    async getUnBlockedReasons() {
      return getSystemCodeOptions("UnBlockedReasonID");
    }

    async getSavingPaymentTypes() {
      return getSystemCodeOptions("SavingPaymentTypeID");
    }

    async getProductTypes() {
      return getSystemCodeOptions("ProductTypeID");
    }

    async getInstitutionTypes() {
      return getSystemCodeOptions("InstitutionTypeID");
    }

    async getMandates() {
      return getSystemCodeOptions("AgentMandateID");
    }
    // Treasury: Buy/Sell dropdown (data-lookup="BuySell" => LookupService.getBuySell)
    async getBuySell() {
      // Prefer an env-specific CodeID, but fall back to generic BuySellID.
      // Example override:
      // Environment.systemCodeIds = { BuySell: "BuySellTypeID" }
      const primaryCodeId = resolveCodeId("BuySell", "BuySell");
      const primary = await getSystemCodeOptions(primaryCodeId);
      if (Array.isArray(primary) && primary.length) return primary;

      return getSystemCodeOptions("BuySellID");
    }

    async getTransactionModes() {
      return getSystemCodeOptions("TrxModeID");
    }

    async getTransactionTypes() {
      return getSystemCodeOptions("TransactionTypeID");
    }

    async getBasicTrxTypeIDTypes() {
      return getSystemCodeOptions("BasicTrxTypeID");
    }

    async getAccountTypeID() {
      return getSystemCodeOptions("AccountTypeID");
    }

    async getTransactionCategories() {
      return getSystemCodeOptions("TrxCategoryID");
    }

    // Treasury: FX Transfer Mode dropdown (data-lookup="FXTransferMode" => LookupService.getFXTransferMode)
    async getFXTransferMode() {
      // Prefer an FX-specific CodeID, but fall back to generic Trx Modes.
      // Example override:
      // Environment.systemCodeIds = { FXTransferMode: "FXTransferModeID" }
      const primaryCodeId = resolveCodeId("FXTransferMode", "FXTransferMode");
      const primary = await getSystemCodeOptions(primaryCodeId);
      if (Array.isArray(primary) && primary.length) return primary;

      return getSystemCodeOptions("TrxModeID");
    }

    async getDealTypes() {
      return getSystemCodeOptions("DealTypeID");
    }

    // Treasury: FX Deal Type dropdown (data-lookup="FXDealType" => LookupService.getFXDealType)
    async getFXDealType() {
      // Prefer an FX-specific CodeID, but fall back to generic Deal Types.
      // Example override:
      // Environment.systemCodeIds = { FXDealType: "FXDealTypeID" }
      const primaryCodeId = resolveCodeId("FXDealType", "FXDealType");
      const primary = await getSystemCodeOptions(primaryCodeId);
      if (Array.isArray(primary) && primary.length) return primary;

      return getSystemCodeOptions("DealTypeID");
    }

    /**
     * Generic search/lookup method
     * @param {string} term - Search term
     * @param {string} module - Module name (e.g., "CLIENT_MAINTENANCE", "ACCOUNT_MAINTENANCE")
     * @returns {Promise<Array>} Search results
     */
    async performLookup(term, module) {
      if (!term || term.length < 3) {
        return [];
      }

      const requestData = {
        SearchTerm: term,
        Module: module
      };

      try {
        const response = await this.getSystemSearch(requestData);

        if (!response.success) {
          console.error(`${module} search failed:`, response.message);
          return [];
        }

        return response.data || [];
      } catch (error) {
        console.error(`${module} search failed`, error);
        return [];
      }
    }

    async searchClients(term) {
      return this.performLookup(term, "CLIENT_MAINTENANCE");
    }
    async searchUsers(term) {
      return this.performLookup(term, "USER_MAINTENANCE");
    }


    async searchAccounts(term) {
      return this.performLookup(term, "ACCOUNT_MAINTENANCE");
    }

    /**
     * Search for operators (login IDs)
     * @param {object} criteria - Search criteria { WhereStmt, OperatorID, OurBranchID, etc. }
     * @returns {Promise} Search results
     */
    async searchOperators(criteria) {
      const requestData = {
        ...criteria,
        TableID: 'OperatorID',
        AdvFilterString: 'IsLoginDeleted = 0',
        ModuleID: 2315,
        LanguageID: 'en'
      };
      const envelope = CoreApi.makeRequestEnvelope("p_GetSearchResult", requestData);
      return CoreApi.post(endpoints.getSystemSearch, envelope);
    }

    /**
     * Get branches
     * @param {object} requestData - { BankID }
     * @returns {Promise} Branch search results
     */
    async getBranches(requestData = {}) {
      const formId = "dbo.pc_SearchSystemBranches";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData, "PROJECT_KAIRO");

      envelope.RequestID = formId;
      envelope.FormId = formId;

      return CoreApi.post(endpoints.getSystemSearch, envelope);
    }

    /**
     * Generic search result method
     * @param {object} requestData - Search criteria { TableID, WhereStmt, AdvFilterString, etc. }
     * @returns {Promise} Search results
     */
    async getSearchResult(requestData) {
      const formId = "dbo.p_GetSearchResult";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData, "PROJECT_KAIRO");
      return CoreApi.post(endpoints.getSystemSearch, envelope);
    }

    /**
     * Clear cache for a specific code or all codes
     * @param {string} codeId - Optional code ID to clear, or clear all if not provided
     */
    clearCache(codeId = null) {
      if (codeId) {
        cache.delete(`code:${codeId}`);
      } else {
        cache.clear();
      }
    }
  }

  const instance = new LookupService();
  global.LookupService = instance;
  global.lookupService = instance;
})(window);
