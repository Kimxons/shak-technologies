/**
 * General Ledger Service
 * Handles all API interactions for General Ledger module
 */
/**
 * General Ledger Service
 * Handles all API interactions for General Ledger module
 */
(function (global) {
  const CoreApi = global.CoreApi;
  const BASE_URL = (Environment.baseUrlGeneralLedger || Environment.baseUrlCommon || "http://localhost:5000").replace(/\/+$/, "");

  const formatRequestTime = (date = new Date()) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  };

  const GeneralLedgerService = {

    getNostroAccount(requestData) {
      // Build envelope as per required format
      const now = new Date();
      const pad = n => n.toString().padStart(2, '0');
      const reqTime = `${pad(now.getMonth() + 1)}/${pad(now.getDate())}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      const envelope = {
        RequestID: "dbo.p_GetNostroAccount",
        FormId: "dbo.p_GetNostroAccount",
        RequestData: requestData || {},
        RequestTime: reqTime,
        AppName: "PROJECT_KAIRO",
        Checksum: ""
      };
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    /**
     * Get GL Account records
     * @param {Object} requestData - { BankID, OurBranchID, AccountID, OperatorID, Direction }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    getGL(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetGL", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Save (Create/Update) GL Account
     * @param {Object} requestData - Form data for GL account
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    saveGL(requestData) {
      // Build envelope exactly like the required contract for dbo.p_AddEditGL
      const envelope = {
        RequestID: "dbo.p_AddEditGL",
        FormId: "dbo.p_AddEditGL",
        RequestData: requestData,
        RequestTime: formatRequestTime(new Date()),
        AppName: "PROJECT_KAIRO",
        Checksum: ""
      };
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    // Explicit alias for readability
    addEditGL(requestData) {
      return this.saveGL(requestData);
    },

    /**
     * Delete GL Account
     * @param {Object} requestData - { BankID, AccountID, NewRecord }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    deleteGL(requestData) {
      // Build envelope exactly like the required contract for dbo.p_DeleteGL
      const envelope = {
        RequestID: "dbo.p_DeleteGL",
        FormId: "dbo.p_DeleteGL",
        RequestData: requestData,
        RequestTime: formatRequestTime(new Date()),
        AppName: "PROJECT_KAIRO",
        Checksum: ""
      };
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Get GL Type Group
     * @param {Object} requestData - { BankID, OurBranchID, GLAccountTypeID, OperatorID }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    getGLTypeGroup(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetGLTypeGroup", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Get GL Sub Account Type
     * @param {Object} requestData - { BankID, OurBranchID, GLAccountTypeID, GLTypeGroupID, OperatorID }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    getGLSubAccountType(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetGLSubAccountType", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Add/Edit GL Sub Account Type (batch operation with XML)
     * @param {Object} requestData - { BankID, GLAccountTypeID, GLTypeGroupID, OperatedBy, OperatedOn, SupervisedBy, UpdateCount, DetailRecords }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    addEditGLSubAccountType(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_AddEditGLSubAccountType", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Delete GL Sub Account Type
     * @param {Object} requestData - { BankID, GLAccountTypeID, GLTypeGroupID }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    deleteGLSubAccountType(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_DeleteGLSubAccountType", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Save GL Sub Account Type
     * @param {Object} requestData - { BankID, GLAccountTypeID, GLTypeGroupID, GLSubAccountTypeID, Description, OperatorID, ... }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    saveGLSubAccountType(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_SaveGLSubAccountType", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Edit GL Sub Account Type
     * @param {Object} requestData - { BankID, GLAccountTypeID, GLTypeGroupID, GLSubAccountTypeID, Description, CreatedBy, ModifiedBy, SupervisedBy, ... }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    editGLSubAccountType(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_EditGLSubAccountType", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Delete GL Sub Account Type
     * @param {Object} requestData - { BankID, GLAccountTypeID, GLTypeGroupID, GLSubAccountTypeID, OperatorID }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    deleteGLSubAccountType(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_DeleteGLSubAccountType", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Get GL Transactions/Entries
     * @param {Object} requestData - { AccountID, FromDate, ToDate, ... }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    getGLTransactions(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetGLTransactions", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Post GL Entry
     * @param {Object} requestData - Transaction data
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    postGLEntry(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_PostGLEntry", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Get GL Balance
     * @param {Object} requestData - { AccountID, AsOfDate, ... }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    getGLBalance(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetGLBalance", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Close GL Account
     * @param {Object} requestData - { AccountID, ClosedReason, ... }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    closeGL(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_CloseGL", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Get GL Parameters
     * @param {Object} requestData - Request data object
     * @param {string} requestData.OurBranchID - Branch ID (required)
     * @param {string} [requestData.GLParameterID] - GL Parameter ID (optional, for single record)
     * @param {string} requestData.OperatorID - Operator ID (required)
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     * @description Retrieves GL Parameters. If GLParameterID is provided, returns single record; otherwise returns all parameters for the branch.
     */
    getGLParameters(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetGLParameters", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Save (Add) GL Parameters
     * @param {Object} requestData - Request data object
     * @param {string} requestData.OurBranchID - Branch ID (required)
     * @param {string} requestData.GLParameterID - GL Parameter ID (required)
     * @param {string} requestData.AccountID - Account ID (required)
     * @param {string} [requestData.Remarks] - Remarks/Description (optional)
     * @param {string} requestData.OperatorID - Operator ID (required)
     * @param {string} requestData.CreatedBy - Created by operator ID (required)
     * @param {string} requestData.CreatedOn - Created on date (MM/DD/YYYY format)
     * @param {number} [requestData.NewRecord=1] - New record flag (1 for new, 0 for existing)
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     * @description Adds a new GL Parameter record
     */
    saveGLParameters(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_SaveGLParameters", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Edit GL Parameters (Update existing record)
     * @param {Object} requestData - Request data object
     * @param {string} requestData.OurBranchID - Branch ID (required)
     * @param {string} requestData.GLParameterID - GL Parameter ID (required)
     * @param {string} requestData.AccountID - Account ID (required)
     * @param {string} [requestData.Remarks] - Remarks/Description (optional)
     * @param {string} requestData.CreatedBy - Created by operator ID (required)
     * @param {string} requestData.CreatedOn - Created on date (MM/DD/YYYY format)
     * @param {string} requestData.ModifiedBy - Modified by operator ID (required)
     * @param {string} requestData.ModifiedOn - Modified on date (MM/DD/YYYY format)
     * @param {string} requestData.SupervisedBy - Supervised by operator ID (required)
     * @param {number} [requestData.NewRecord=0] - New record flag (0 for edit/update)
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     * @description Updates an existing GL Parameter record. Used in Edit -> Alter -> Update -> Save workflow.
     */
    editGLParameters(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_EditGLParameters", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Delete GL Parameters
     * @param {Object} requestData - Request data object
     * @param {string} requestData.OurBranchID - Branch ID (required)
     * @param {string} requestData.GLParameterID - GL Parameter ID to delete (required)
     * @param {string} requestData.OperatorID - Operator ID (required)
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     * @description Deletes a GL Parameter record
     */
    deleteGLParameters(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_DeleteGLParameters", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Get GL Category Codes
     * @param {Object} requestData - { BankID }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    getGLCategoryCodes(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetGLCategoryCodes", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Save GL Category Code
     * @param {Object} requestData - GL category code data
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    saveGLCategoryCode(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_SaveGLCategoryCode", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Edit GL Category Code
     * @param {Object} requestData - { BankID, GLCategoryID, PrefixCode, Description, ... }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    editGLCategoryCode(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_EditGLCategoryCode", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Delete GL Category Code
     * @param {Object} requestData - { BankID, GLCategoryID, OperatorID }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    deleteGLCategoryCode(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_DeleteGLCategoryCode", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Get GL Account Codes (AccountType Prefix Codes)
     * @param {Object} requestData - { BankID }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    getGLAccountCodes(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetGLAccountCodes", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Save GL Account Code
     * @param {Object} requestData - GL account code data
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    saveGLAccountCode(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_SaveGLAccountCode", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Edit GL Account Code
     * @param {Object} requestData - { BankID, GLAccountTypeID, PrefixCode, Description, ... }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    editGLAccountCode(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_EditGLAccountCode", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Delete GL Account Code
     * @param {Object} requestData - { BankID, GLAccountTypeID, OperatorID }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    deleteGLAccountCode(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_DeleteGLAccountCode", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Get InterBranch GL Parameters
     * @param {Object} requestData - { OurBranchID, OperatorID, Direction }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    getGLInterBranch(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetGLInterBranch", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Save InterBranch GL Parameter
     * @param {Object} requestData - InterBranch GL parameter data
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    saveGLInterBranch(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_SaveGLInterBranch", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Edit InterBranch GL Parameter
     * @param {Object} requestData - { OurBranchID, AccountTagID, CurrencyID, AccountID, ... }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    editGLInterBranch(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_EditGLInterBranch", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Delete InterBranch GL Parameter
     * @param {Object} requestData - { OurBranchID, AccountTagID, OperatorID }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    deleteGLInterBranch(requestData) {
      // Use correct FormID and AppName if needed
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_DeleteGLInterBranch", requestData, Environment.appName || "PROJECT_KAIRO");
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Add/Edit InterBranch GL Parameter
     * @param {Object} requestData - { OurBranchID, OperatedBy, OperatedOn, SupervisedBy, UpdateCount, DetailRecords }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    addEditGLInterBranch(requestData) {
      // Build envelope as per required format
      const now = new Date();
      const pad = n => n.toString().padStart(2, '0');
      const reqTime = `${pad(now.getMonth() + 1)}/${pad(now.getDate())}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      const envelope = {
        RequestID: "dbo.p_AddEditGLInterBranch",
        FormId: "dbo.p_AddEditGLInterBranch",
        RequestData: requestData,
        RequestTime: reqTime,
        AppName: "PROJECT_KAIRO",
        Checksum: ""
      };
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Get GL Financial Format (Balance Sheet / Profit & Loss)
     * @param {Object} requestData - { BankID, OurBranchID, ReportTypeID, OperatorID }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    getGLFinancialFormat(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GLBSPLFormat", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Add/Save GL Financial Format
     * @param {Object} requestData - { BankID, ReportTypeID, OperatedBy, OperatedOn, SupervisedBy, DetailAccountType, DetailTypeGroup, DetailSubAccountType, DetailAccount }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    saveGLFinancialFormat(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_AddGLBSPLFormat", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Edit GL Financial Format
     * @param {Object} requestData - { BankID, ReportTypeID, DetailAccountType, DetailTypeGroup, DetailSubAccountType, DetailAccount, ... }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    editGLFinancialFormat(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_EditGLBSPLFormat", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Delete GL Financial Format
     * @param {Object} requestData - { BankID, ReportTypeID, OperatorID }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    deleteGLFinancialFormat(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_DeleteGLBSPLFormat", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Get GL Budget
     * @param {Object} requestData - { OurBranchID, ReportTypeID, BudgetTypeID, FinYearTypeID, SlabTypeID, OperatorID }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    getGLBudget(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetGLBudget", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Save GL Budget
     * @param {Object} requestData - Budget data with monthly values
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    saveGLBudget(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_SaveGLBudget", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Edit GL Budget
     * @param {Object} requestData - { OurBranchID, BudgetTypeID, AccountID, MonthlyValues, ... }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    editGLBudget(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_EditGLBudget", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Delete GL Budget
     * @param {Object} requestData - { OurBranchID, BudgetTypeID, AccountID, OperatorID }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    deleteGLBudget(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_DeleteGLBudget", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Search GL Parameters by GL ID using dbo.p_GetSearchResult
     * @param {Object} requestData - Search request data
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    getSearchResult(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetSearchResult", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Get GL Branch Details using dbo.p_getGLBranches
     * @param {Object} requestData - { OurBranchID, AccountID, OperatorID, Direction }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    getGLBranches(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_getGLBranches", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Add GL Branch
     * @param {Object} requestData - { OurBranchID, AccountID, BankID, CreatedBy, CreatedOn, SupervisedBy }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    addGLBranches(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_AddGLBranches", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Get Currencies (for Currency Search Modal)
     * @param {Object} requestData - Search/filter parameters (optional)
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     * @description Retrieves list of currencies for selection/search
     */
    /**
     * Search Currencies for InterBranch GL Parameters (new contract)
     * @param {Object} requestData - Search/filter parameters (optional)
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    getCurrencies(requestData) {
      // Build envelope as per required format
      const now = new Date();
      const pad = n => n.toString().padStart(2, '0');
      const reqTime = `${pad(now.getMonth() + 1)}/${pad(now.getDate())}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      const envelope = {
        RequestID: "dbo.pc_SearchCurrencies",
        FormId: "dbo.pc_SearchCurrencies",
        RequestData: requestData || {},
        RequestTime: reqTime,
        AppName: "PROJECT_KAIRO",
        Checksum: ""
      };
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Add/Edit GL Category Prefix Code (unified for Add/Edit)
     * @param {Object} requestData - { BankID, DetailRecord (xml), OperatorID }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    addEditGLCategoryPrefixCode(requestData) {
      const now = new Date();
      const pad = n => n.toString().padStart(2, '0');
      const reqTime = `${pad(now.getMonth() + 1)}/${pad(now.getDate())}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      const envelope = {
        RequestID: "dbo.p_AddEditGLCategoryCodes",
        FormId: "dbo.p_AddEditGLCategoryCodes",
        RequestData: requestData,
        RequestTime: reqTime,
        AppName: "PROJECT_KAIRO",
        Checksum: ""
      };
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Add/Edit GL Type Group (unified for Add/Edit)
     * @param {Object} requestData - { BankID, GLAccountTypeID, OperatedBy, OperatedOn, SupervisedBy, UpdateCount, DetailRecords }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    addEditGLTypeGroup(requestData) {
      const now = new Date();
      const pad = n => n.toString().padStart(2, '0');
      const reqTime = `${pad(now.getMonth() + 1)}/${pad(now.getDate())}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      const envelope = {
        RequestID: "dbo.p_AddEditGLTypeGroup",
        FormId: "dbo.p_AddEditGLTypeGroup",
        RequestData: requestData,
        RequestTime: reqTime,
        AppName: "PROJECT_KAIRO",
        Checksum: ""
      };
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    deleteGLTypeGroup(requestData) {
      const now = new Date();
      const pad = n => n.toString().padStart(2, '0');
      const reqTime = `${pad(now.getMonth() + 1)}/${pad(now.getDate())}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      const envelope = {
        RequestID: "dbo.p_DeleteGLTypeGroup",
        FormId: "dbo.p_DeleteGLTypeGroup",
        RequestData: requestData,
        RequestTime: reqTime,
        AppName: "PROJECT_KAIRO",
        Checksum: ""
      };
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Get Blocked Details (History)
     * @param {Object} requestData - { OurBranchID, ModuleTypeID, RelevantID, OperatorID, ModuleID }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    getBlockedDetails(requestData) {
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, {
        RequestID: "dbo.p_GetBlockedDetails",
        FormId: "dbo.p_GetBlockedDetails",
        RequestData: requestData,
        RequestTime: formatRequestTime(),
        AppName: "PROJECT_KAIRO",
        Checksum: ""
      });
    },

    /**
     * Add or edit blocked details for an account
     * @param {Object} requestData - { OurBranchID, ModuleTypeID, RelevantID, BlockedDate, BlockedReasonID, BlockedDescription, BlockedInstructionBy, CreatedBy, CreatedOn, SupervisedBy }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    addBlockedDetails(requestData) {
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, {
        RequestID: "dbo.p_AddBlockedDetails",
        FormId: "dbo.p_AddBlockedDetails",
        RequestData: requestData,
        RequestTime: formatRequestTime(),
        AppName: "PROJECT_KAIRO",
        Checksum: ""
      });
    },

    /**
     * Get Cheque Books
     * @param {Object} requestData - { OurBranchID, AccountTypeID, AccountID, RequestReferenceNo, OperatorID, Direction }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    getChequeBooks(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetChequeBooks", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Add or Edit Cheque Book Requests (with workflow: APP -> ISD -> RDY)
     * @param {Object} requestData - Cheque book request data
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    addEditChequeBookRequests(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_AddEditChequeBookRequests", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Delete Cheque Book Request
     * @param {Object} requestData - { OurBranchID, AccountTypeID, AccountID, RequestReferenceNo, NewRecord }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    deleteChequeBookRequest(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_DeleteChequeBooks", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Add or Edit Cheque Books (Direct - no workflow)
     * @param {Object} requestData - Cheque book data
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    addEditChequeBooks(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_AddEditChequeBooks", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    /**
     * Add AdHoc Charge
     * @param {Object} requestData - { BankID, SerialID, OurBranchID, AccountID, ChargeID, ChargeAmount, CustomerNarration, OperatedBy, OperatedOn, SupervisedBy, UpdateCount }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    addAdHocCharge(requestData) {
      // Build envelope as per required format for dbo.p_AddAdHocCharge
      const now = new Date();
      const pad = n => n.toString().padStart(2, '0');
      const reqTime = `${pad(now.getMonth() + 1)}/${pad(now.getDate())}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      const envelope = {
        RequestID: "dbo.p_AddAdHocCharge",
        FormId: "dbo.p_AddAdHocCharge",
        RequestData: requestData,
        RequestTime: reqTime,
        AppName: "PROJECT_KAIRO",
        Checksum: ""
      };
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    }
  };

  global.GeneralLedgerService = GeneralLedgerService;
})(window);
