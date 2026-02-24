/**
 * Account Classification Service
 * Handles all API interactions for Account Classification module
 */
(function (global) {
  const CoreApi = global.CoreApi;
  const BASE_URL = (
    Environment.baseUrlAccountClassification || 
    Environment.baseUrlCommon || 
    "http://localhost:5000"
  ).replace(/\/+$/, "");

  const formatRequestTime = (date = new Date()) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  };

  const AccountClassificationService = {
    /**
     * Get Account Classifications
     * @param {Object} requestData - { OurBranchID, AccountID }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    getAccountClassification(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetAccountClassification", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Save (Add) Account Classification
     * @param {Object} requestData - Account classification data
     * @param {string} requestData.BankID - Bank ID (required)
     * @param {string} requestData.OurBranchID - Branch ID (required)
     * @param {string} requestData.ClassificationID - Classification ID (required)
     * @param {string} requestData.ClassificationName - Classification name (required)
     * @param {string} requestData.Description - Description (optional)
     * @param {string} requestData.CreatedBy - Created by operator ID (required)
     * @param {string} requestData.CreatedOn - Created on date (MM/DD/YYYY format)
     * @param {string} requestData.OperatorID - Operator ID (required)
     * @param {number} [requestData.NewRecord=1] - New record flag (1 for new)
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    saveAccountClassification(requestData) {
      const envelope = {
        RequestID: "dbo.p_SaveAccountClassification",
        FormId: "dbo.p_SaveAccountClassification",
        RequestData: requestData,
        RequestTime: formatRequestTime(new Date()),
        AppName: "PROJECT_KAIRO",
        Checksum: ""
      };
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Edit Account Classification (Update existing record)
     * @param {Object} requestData - Account classification data
     * @param {string} requestData.BankID - Bank ID (required)
     * @param {string} requestData.OurBranchID - Branch ID (required)
     * @param {string} requestData.ClassificationID - Classification ID (required)
     * @param {string} requestData.ClassificationName - Classification name (required)
     * @param {string} requestData.Description - Description (optional)
     * @param {string} requestData.CreatedBy - Created by operator ID (required)
     * @param {string} requestData.CreatedOn - Created on date (MM/DD/YYYY format)
     * @param {string} requestData.ModifiedBy - Modified by operator ID (required)
     * @param {string} requestData.ModifiedOn - Modified on date (MM/DD/YYYY format)
     * @param {string} requestData.SupervisedBy - Supervised by operator ID (required)
     * @param {number} [requestData.NewRecord=0] - New record flag (0 for edit)
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    editAccountClassification(requestData) {
      const envelope = {
        RequestID: "dbo.p_EditAccountClassification",
        FormId: "dbo.p_EditAccountClassification",
        RequestData: requestData,
        RequestTime: formatRequestTime(new Date()),
        AppName: "PROJECT_KAIRO",
        Checksum: ""
      };
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Add/Edit Account Classification (unified operation)
     * @param {Object} requestData - Account classification data with NewRecord flag
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    addEditAccountClassification(requestData) {
      const envelope = {
        RequestID: "dbo.p_AddEditAccountClassification",
        FormId: "dbo.p_AddEditAccountClassification",
        RequestData: requestData,
        RequestTime: formatRequestTime(new Date()),
        AppName: "PROJECT_KAIRO",
        Checksum: ""
      };
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Delete Account Classification
     * @param {Object} requestData - { BankID, OurBranchID, ClassificationID, OperatorID }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    deleteAccountClassification(requestData) {
      const envelope = {
        RequestID: "dbo.p_DeleteAccountClassification",
        FormId: "dbo.p_DeleteAccountClassification",
        RequestData: requestData,
        RequestTime: formatRequestTime(new Date()),
        AppName: "PROJECT_KAIRO",
        Checksum: ""
      };
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Get Account Classification Details (with sub-types or categories)
     * @param {Object} requestData - { BankID, OurBranchID, ClassificationID, OperatorID }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    getAccountClassificationDetails(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetAccountClassificationDetails", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Get Account Classification Types
     * @param {Object} requestData - { BankID, OurBranchID, OperatorID }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    getAccountClassificationTypes(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetAccountClassificationTypes", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Assign Classification to Accounts (Batch operation)
     * @param {Object} requestData - { BankID, OurBranchID, ClassificationID, AccountIDs, OperatorID }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    assignClassificationToAccounts(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_AssignClassificationToAccounts", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Get Accounts by Classification
     * @param {Object} requestData - { BankID, OurBranchID, ClassificationID, OperatorID }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    getAccountsByClassification(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetAccountsByClassification", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Search Account Classifications
     * @param {Object} requestData - Search criteria
     * @param {string} requestData.BankID - Bank ID
     * @param {string} requestData.OurBranchID - Branch ID
     * @param {string} [requestData.SearchTerm] - Search term for classification name or ID
     * @param {string} requestData.OperatorID - Operator ID
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    searchAccountClassifications(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_SearchAccountClassifications", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Validate Account Classification
     * @param {Object} requestData - { BankID, ClassificationID, OperatorID }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    validateAccountClassification(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_ValidateAccountClassification", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Get Classification Statistics
     * @param {Object} requestData - { BankID, OurBranchID, ClassificationID, OperatorID }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    getClassificationStatistics(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetClassificationStatistics", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Get User Codes (Classification Codes and Sub Codes)
     * @param {Object} requestData - { OurBranchID, ID, OperatorID }
     * @param {string} requestData.OurBranchID - Branch ID (required)
     * @param {string} requestData.ID - User ID / Code ID (optional)
     * @param {string} requestData.OperatorID - Operator ID (required)
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    getUserCodes(requestData) {
      const envelope = {
        RequestID: "dbo.p_GetUserCodes",
        FormId: "dbo.p_GetUserCodes",
        RequestData: requestData,
        RequestTime: formatRequestTime(new Date()),
        AppName: "PROJECT_KAIRO",
        Checksum: ""
      };
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Get All User Code Categories (for Classification Code dropdown)
     * @param {Object} requestData - { OurBranchID, ModuleID, OperatorID }
     * @param {string} requestData.OurBranchID - Branch ID (required)
     * @param {string} requestData.ModuleID - Module ID (e.g., '02' for account classifications)
     * @param {string} requestData.OperatorID - Operator ID (required)
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    getAllUserCodeCategories(requestData) {
      const envelope = {
        RequestID: "dbo.p_GetAllUserCodes",
        FormId: "dbo.p_GetAllUserCodes",
        RequestData: requestData,
        RequestTime: formatRequestTime(new Date()),
        AppName: "PROJECT_KAIRO",
        Checksum: ""
      };
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    }
  };

  global.AccountClassificationService = AccountClassificationService;
})(window);
