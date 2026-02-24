(function (global) {
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};

  if (!CoreApi) {
    console.error(
      "CoreApi is not loaded. Ensure services/shared/coreApi.js is included before staticDataService.js."
    );
    return;
  }

  // Resolve the OldAPI endpoint - prefer relative path for proxy, or use configured base URL
  function resolveOldApiEndpoint() {
    // If using local proxy, use relative path
    if (Environment.useLocalOldApiProxy === true) {
      return '/api/OldAPI';
    }
    
    // Try to get base URL from Environment
    const baseUrl = (
      Environment.baseUrlCommon ||
      Environment.baseUrlSystemCodes ||
      ''
    ).toString().replace(/\/+$/g, '');
    
    // If base URL is configured, use it; otherwise use relative path
    return baseUrl ? `${baseUrl}/api/OldAPI` : '/api/OldAPI';
  }

  const APP_NAME = "PROJECT_KAIRO";

  // OldAPI samples commonly show: MM/DD/YYYY HH:mm:ss
  function formatLegacyRequestTime(d = new Date()) {
    const pad2 = (n) => String(n).padStart(2, "0");
    const mm = pad2(d.getMonth() + 1);
    const dd = pad2(d.getDate());
    const yyyy = d.getFullYear();
    const hh = pad2(d.getHours());
    const mi = pad2(d.getMinutes());
    const ss = pad2(d.getSeconds());
    return `${mm}/${dd}/${yyyy} ${hh}:${mi}:${ss}`;
  }

  /**
   * Generic helper for Static Data screens that talk to OldAPI.
   * @param {string} formID Backend form/procedure ID (e.g. "dbo.p_SomeProc")
   * @param {object} requestData Payload
   * @param {string|null} appName Optional AppName override
   */
  function postOldApi(formID, requestData = {}, appName = null) {
    const envelope = CoreApi.makeRequestEnvelope(formID, requestData, appName);

    // Some procedures expect these legacy fields to be present/consistent.
    envelope.RequestID = formID;
    envelope.FormID = formID;
    envelope.FormId = formID;
    envelope.RequestTime = formatLegacyRequestTime();

    // Use dynamic endpoint resolution
    const endpoint = resolveOldApiEndpoint();
    return CoreApi.post(endpoint, envelope);
  }

  const svc = (global.StaticDataService = global.StaticDataService || {});

  // Base helper
  svc.postOldApi = postOldApi;

  // ============================
  // Insurance Policy
  // ============================
  svc.getInsurancePolicy = function getInsurancePolicy(PolicyNo) {
    return postOldApi("dbo.P_GetInsurancePolicy", { PolicyNo }, APP_NAME);
  };

  svc.addEditInsurancePolicy = function addEditInsurancePolicy(payload) {
    return postOldApi("dbo.P_AddEditInsurancePolicy", payload || {}, APP_NAME);
  };

  svc.deleteInsurancePolicy = function deleteInsurancePolicy(PolicyNo) {
    return postOldApi("dbo.P_DeleteInsurancePolicy", { PolicyNo }, APP_NAME);
  };

  // ============================
  // Contact Person
  // ============================
  svc.getContactPerson = function getContactPerson(ContactPersonID, Direction = 0) {
    return postOldApi(
      "dbo.p_GetContactPerson",
      { ContactPersonID, Direction },
      APP_NAME
    );
  };

  svc.addEditContactPerson = function addEditContactPerson(payload) {
    return postOldApi("dbo.P_AddEditContactPerson", payload || {}, APP_NAME);
  };

  svc.deleteContactPerson = function deleteContactPerson(ContactPersonID) {
    return postOldApi("dbo.P_DeleteContactPerson", { ContactPersonID }, APP_NAME);
  };

  // ============================
  // Location
  // ============================
  svc.getLocation = function getLocation(LocationID, Direction = 0) {
    return postOldApi("dbo.P_GetLocation", { LocationID, Direction }, APP_NAME);
  };

  svc.addEditLocation = function addEditLocation(payload) {
    return postOldApi("dbo.P_AddEditLocation", payload || {}, APP_NAME);
  };

  svc.deleteLocation = function deleteLocation(LocationID) {
    return postOldApi("dbo.P_DeleteLocation", { LocationID }, APP_NAME);
  };

  // ============================
  // Vendors
  // ============================
  svc.getVendors = function getVendors(requestData) {
    return postOldApi("dbo.p_GetVendors", requestData || {}, APP_NAME);
  };

  // NOTE: Some deployments reject extra keys with "too many arguments".
  // Keep payload minimal and aligned to the procedure parameter list.
  svc.addEditVendors = function addEditVendors(requestData) {
    return postOldApi("dbo.p_AddEditVendors", requestData || {}, APP_NAME);
  };

  // ============================
  // Loan Analysis
  // ============================
  svc.getLoanAnalysis = function getLoanAnalysis(requestData) {
    return postOldApi("dbo.p_GetLoanAnalysis", requestData || {}, APP_NAME);
  };

  svc.addEditLoanAnalysis = function addEditLoanAnalysis(payload) {
    return postOldApi("dbo.p_AddEditLoanAnalysis", payload || {}, APP_NAME);
  };

  svc.deleteLoanAnalysis = function deleteLoanAnalysis(payload) {
    return postOldApi("dbo.p_DeleteLoanAnalysis", payload || {}, APP_NAME);
  };

  // ============================
  // Identity Types
  // ============================
  svc.getIdentityType = function getIdentityType(requestData) {
    return postOldApi("dbo.p_GetIdentityType", requestData || {}, APP_NAME);
  };

  svc.addEditIdentityTypes = function addEditIdentityTypes(payload) {
    return postOldApi("dbo.p_AddEditIdentityTypes", payload || {}, APP_NAME);
  };

  // ============================
  // Third Party Provider
  // ============================
  svc.getThirdPartyProvider = function getThirdPartyProvider(requestData) {
    return postOldApi("dbo.p_GetThirdPartyProvider", requestData || {}, APP_NAME);
  };

  svc.addEditThirdPartyProvider = function addEditThirdPartyProvider(payload) {
    return postOldApi("dbo.p_AddEditThirdPartyProvider", payload || {}, APP_NAME);
  };

  svc.deleteThirdPartyProvider = function deleteThirdPartyProvider(payload) {
    return postOldApi("dbo.p_DeleteThirdPartyProvider", payload || {}, APP_NAME);
  };

  // ============================
  // Device Maintenance
  // ============================
  svc.getDevice = function getDevice(payload) {
    return postOldApi("dbo.p_GetDevice", payload || {}, APP_NAME);
  };

  svc.addEditDevice = function addEditDevice(payload) {
    return postOldApi("dbo.p_AddEditDevice", payload || {}, APP_NAME);
  };

  svc.deleteDevice = function deleteDevice(payload) {
    return postOldApi("dbo.p_DeleteDevice", payload || {}, APP_NAME);
  };

  // ============================
  // Custodian
  // ============================
  svc.getCustodian = function getCustodian(CustodianID, Direction = 0) {
    return postOldApi(
      "dbo.P_GetCustodian",
      { CustodianID, Direction },
      APP_NAME
    );
  };
svc.addEditCustodian = function addEditCustodian(payload) {
    return postOldApi("dbo.P_AddEditCustodian", payload || {}, APP_NAME);
  };

  svc.deleteCustodian = function deleteCustodian(CustodianID) {
    return postOldApi("dbo.P_DeleteCustodian", { CustodianID }, APP_NAME);
  };
  // ============================
  // Insurance Code
  // ============================
  /**
   * Fetch Insurance Code details by InsuranceCode
   * @param {string} InsuranceCode
   * @returns {Promise}
   */
  svc.getInsuranceCode = function getInsuranceCode(InsuranceCode) {
    // IMPORTANT:
    // Some deployments require @InsuranceCode to always be supplied.
    // NOTE: CoreApi envelope builders may drop null/undefined keys.
    // Always pass a string value to ensure the parameter is supplied.
    const code = InsuranceCode == null ? "" : String(InsuranceCode);
    return postOldApi("dbo.P_GetInsuranceCode", { InsuranceCode: code }, APP_NAME);
  };

  svc.addEditInsuranceCode = function addEditInsuranceCode(payload) {
    return postOldApi("dbo.P_AddEditInsuranceCode", payload || {}, APP_NAME);
  };

  svc.deleteInsuranceCode = function deleteInsuranceCode(InsuranceCode) {
    return postOldApi("dbo.P_DeleteInsuranceCode", { InsuranceCode }, APP_NAME);
  };

  // ============================
  // Transaction Descriptions
  // ============================
  svc.getTrxDescriptions = function getTrxDescriptions(requestData) {
    return postOldApi("dbo.p_GetTrxDescriptions", requestData || {}, APP_NAME);
  };

  svc.addEditTrxDescription = function addEditTrxDescription(payload) {
    return postOldApi("dbo.p_AddEditTrxDescriptions", payload || {}, APP_NAME);
  };

  svc.deleteTrxDescription = function deleteTrxDescription(payload) {
    return postOldApi("dbo.p_DeleteTrxDescriptions", payload || {}, APP_NAME);
  };

  /**
   * Fetch Transaction Types for dropdown (SystemCodes)
   * @returns {Promise}
   */
  svc.getTransactionTypes = function getTransactionTypes() {
    return postOldApi("dbo.p_v1_GetSystemCodes", { CodeID: "TransactionTypeID" }, APP_NAME);
  };

  /**
   * Fetch Transaction Categories for dropdown (SystemCodes/UserCodeDetail)
   * @returns {Promise}
   */
  svc.getTransactionCategories = function getTransactionCategories() {
    return postOldApi("dbo.p_v1_GetSystemCodes", { CodeID: "TrxCategoryID" }, APP_NAME);
  };

  // ============================
  // NGO Maintenance
  // ============================
  svc.getNGO = function getNGO(payload) {
    return postOldApi("dbo.p_GetNGO", payload || {}, APP_NAME);
  };

  svc.addEditNGO = function addEditNGO(payload) {
    return postOldApi("dbo.p_AddEditNGO", payload || {}, APP_NAME);
  };

  svc.deleteNGO = function deleteNGO(payload) {
    return postOldApi("dbo.p_DeleteNGO", payload || {}, APP_NAME);
  };

  // ============================
  // Guarantors
  // ============================
  svc.getGuarantors = function getGuarantors(payload) {
    return postOldApi("dbo.p_GetGuarantors", payload || {}, APP_NAME);
  };

  svc.addEditGuarantors = function addEditGuarantors(payload) {
    return postOldApi("dbo.p_AddEditGuarantors", payload || {}, APP_NAME);
  };

  svc.deleteGuarantors = function deleteGuarantors(payload) {
    return postOldApi("dbo.p_DeleteGuarantors", payload || {}, APP_NAME);
  };

  // ============================
  // Account Officers (Officers Maintenance)
  // ============================
  svc.getAccountOfficers = function getAccountOfficers(payload) {
    return postOldApi("dbo.p_GetAccountOfficers", payload || {}, APP_NAME);
  };

  svc.addEditAccountOfficers = function addEditAccountOfficers(payload) {
    return postOldApi("dbo.p_AddEditAccountOfficers", payload || {}, APP_NAME);
  };

  svc.addEditAccountOfficerDetail = function addEditAccountOfficerDetail(payload) {
    return postOldApi("dbo.p_AddEditAccountOfficerDetail", payload || {}, APP_NAME);
  };

  svc.deleteAccountOfficers = function deleteAccountOfficers(payload) {
    return postOldApi("dbo.p_DeleteAccountOfficers", payload || {}, APP_NAME);
  };

  svc.resignAccountOfficers = function resignAccountOfficers(payload) {
    return postOldApi("dbo.p_ResignAccountOfficers", payload || {}, APP_NAME);
  };

  // ============================
  // Insurance Companies
  // ============================
  svc.getInsurances = function getInsurances(payload) {
    return postOldApi("dbo.p_GetInsurances", payload || {}, APP_NAME);
  };

  svc.addEditInsurance = function addEditInsurance(payload) {
    // IMPORTANT: The actual proc is p_AddEditInsurances (plural) and takes individual parameters, not XML.
    return postOldApi("dbo.p_AddEditInsurances", payload || {}, APP_NAME);
  };

  svc.deleteInsurance = function deleteInsurance(payload) {
    return postOldApi("dbo.p_DeleteInsurances", payload || {}, APP_NAME);
  };

  // ============================
  // Bank User Code
  // ============================
  svc.getBankUserCode = function getBankUserCode(payload) {
    return postOldApi("dbo.p_GetBankUserCode", payload || {}, APP_NAME);
  };

  svc.addEditBankUserCodes = function addEditBankUserCodes(payload) {
    return postOldApi("dbo.p_AddEditBankUserCodes", payload || {}, APP_NAME);
  };

  // ============================
  // System Codes (Generic)
  // ============================
  /**
   * Fetch System Codes for any CodeID
   * @param {Object} payload - { BankID, CodeID, OperatorID }
   * @returns {Promise}
   */
  svc.getSystemCodes = function getSystemCodes(payload) {
    return postOldApi("dbo.p_v1_GetSystemCodes", payload || {}, APP_NAME);
  };

  // ============================
  // Breft Bins
  // ============================
  /**
   * Fetch Breft Bin record
   * @param {Object} payload - { BinID }
   * @returns {Promise}
   */
  svc.getBreftBins = function getBreftBins(payload) {
    return postOldApi("dbo.p_GetBreftBins", payload || {}, APP_NAME);
  };

  /**
   * Add or Edit Breft Bin record
   * @param {Object} payload - { OurBranchID, Bin, PayableGLID, ReceivableGLID, OperatorID }
   * @returns {Promise}
   */
  svc.addEditBreftBins = function addEditBreftBins(payload) {
    return postOldApi("dbo.p_AddEditBreftBins", payload || {}, APP_NAME);
  };

})(window);