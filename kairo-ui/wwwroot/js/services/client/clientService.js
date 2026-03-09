(function (global) {
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};

  if (!CoreApi) {
    console.error("CoreApi is not loaded. Ensure services/shared/coreApi.js is included before clientService.js.");
    return;
  }

  // Get base URL from environment
  const CLIENT_BASE_URL = (Environment.baseUrlClient || "http://localhost:6902").replace(/\/+$/, "");

  const endpoints = {
    getClient: `${CLIENT_BASE_URL}/api/v1/ClientMaintenance/GetClient`,
    createClient: `${CLIENT_BASE_URL}/api/v1/ClientMaintenance/CreateClient`,
    updateClient: `${CLIENT_BASE_URL}/api/v1/ClientMaintenance/UpdateClient`,
  };

  const SYSTEM_CODES_BASE_URL = (Environment.baseUrlSystemCodes || "http://localhost:5059").replace(/\/+$/, "");
  const OLD_API_ENDPOINT = `${SYSTEM_CODES_BASE_URL}/api/OldAPI`;
  const BASE_URL = (Environment.baseUrlCommon || Environment.baseUrlSystemCodes || "http://localhost:5059").replace(/\/+$/, "");

  const postOldApi = (formId, requestData) => {
    const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
    return CoreApi.post(OLD_API_ENDPOINT, envelope);
  };

  const rawPostOldApi = async (formId, requestData, appName = "PROJECT_KAIRO") => {
    const envelope = CoreApi.makeRequestEnvelope(formId, requestData, appName);
    envelope.RequestTime = formatRequestTime(new Date());

    const resp = await fetch(OLD_API_ENDPOINT, {
      method: "POST",
      headers: { ...(CoreApi.DEFAULT_HEADERS || { "Content-Type": "application/json", skipToken: "true" }) },
      body: JSON.stringify(envelope)
    });

    const text = await resp.text();
    let payload = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = { ResponseCode: "XX", ResponseMessage: text };
    }

    if (!resp.ok) {
      return {
        success: false,
        code: payload?.ResponseCode || String(resp.status),
        message: payload?.ResponseMessage || resp.statusText,
        raw: payload,
        data: null
      };
    }

    return {
      success: true,
      code: payload?.ResponseCode || "00",
      message: payload?.ResponseMessage || "Success",
      raw: payload,
      data: payload
    };
  };

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  // OldAPI samples commonly show: MM/DD/YYYY HH:mm:ss
  function formatRequestTime(date = new Date()) {
    const mm = pad2(date.getMonth() + 1);
    const dd = pad2(date.getDate());
    const yyyy = String(date.getFullYear());
    const hh = pad2(date.getHours());
    const mi = pad2(date.getMinutes());
    const ss = pad2(date.getSeconds());
    return `${mm}/${dd}/${yyyy} ${hh}:${mi}:${ss}`;
  }

  const ClientService = {
    /**
     * Get client details
     * @param {object} requestData - { ClientID, OurBranchID, etc. }
     * @returns {Promise} Normalized response with { success, code, message, data }
     */
    getClient(requestData) {
      return postOldApi("dbo.p_GetClient", requestData);
    },

    /**
     * Create new client
     * @param {object} requestData - Client data
     * @returns {Promise} Normalized response with { success, code, message, data }
     */
    createClient(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("CreateClient", requestData);
      return CoreApi.post(endpoints.createClient, envelope);
    },

    /**
     * Update existing client
     * @param {object} requestData - Client data with ClientID
     * @returns {Promise} Normalized response with { success, code, message, data }
     */
    updateClient(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("UpdateClient", requestData);
      return CoreApi.post(endpoints.updateClient, envelope);
    },

    /**
     * Stepper GET: Products & Services
     * @param {object} requestData - { ClientID, RequestID }
     * NOTE: For onboarding steppers, pass a stable linking RequestID via requestData.RequestID.
     */
    getProductAndServices(requestData) {
      return postOldApi("p_v1_GetClientProductAndServices", requestData);
    },

    // Stepper GETs (OldAPI)
    getClientAddress(requestData) {
      return postOldApi("p_v1_GetClientAddress", requestData);
    },

    getClientBasicDetails(requestData) {
      return postOldApi("p_v1_GetClientBasicDetails", requestData);
    },

    getClientCorporate(requestData) {
      return postOldApi("p_v1_GetClientCorporate", requestData);
    },

    getClientDocuments(requestData) {
      return postOldApi("p_v1_GetClientDocuments", requestData);
    },

    getClientEmployment(requestData) {
      return postOldApi("p_v1_GetClientEmployment", requestData);
    },

    getClientIndividual(requestData) {
      return postOldApi("p_v1_GetClientIndividual", requestData);
    },

    getClientRelation(requestData) {
      return postOldApi("p_v1_GetClientRelation", requestData);
    },

    getSpecialOffers(requestData) {
      return postOldApi("p_v1_GetClientSpecialOffers", requestData);
    },

    getOtherDetails(requestData) {
      return postOldApi("p_v1_GetClientOtherDetails", requestData);
    },

    // Stepper SAVEs (OldAPI)
    createClientAddress(requestData) {
      return postOldApi("p_V1_CreateClientAddress", requestData);
    },

    updateClientAddress(requestData) {
      return postOldApi("p_v1_UpdateClientAddress", requestData);
    },

    createClientBasicDetails(requestData) {
      return postOldApi("p_V1_CreateClientBasicDetails", requestData);
    },

    updateClientBasicDetails(requestData) {
      return postOldApi("p_v1_UpdateClientBasicDetails", requestData);
    },

    createClientCorporate(requestData) {
      return postOldApi("p_v1_CreateClientCorporate", requestData);
    },

    updateClientCorporate(requestData) {
      return postOldApi("p_v1_UpdateClientCorporate", requestData);
    },

    createClientDocuments(requestData) {
      return postOldApi("p_v1_CreateClientDocuments", requestData);
    },

    updateClientDocuments(requestData) {
      return postOldApi("p_v1_UpdateClientDocuments", requestData);
    },

    createClientEmployment(requestData) {
      return postOldApi("p_v1_CreateClientEmployment", requestData);
    },

    updateClientEmployment(requestData) {
      return postOldApi("p_v1_UpdateClientEmployment", requestData);
    },

    createClientIndividual(requestData) {
      return postOldApi("p_v1_CreateClientIndividual", requestData);
    },

    updateClientIndividual(requestData) {
      return postOldApi("p_v1_UpdateClientIndividual", requestData);
    },

    createClientRelation(requestData) {
      return postOldApi("p_v1_CreateClientRelation", requestData);
    },

    updateClientRelation(requestData) {
      return postOldApi("p_v1_UpdateClientRelation", requestData);
    },

    createSpecialOffers(requestData) {
      return postOldApi("p_v1_CreateClientSpecialOffers", requestData);
    },

    updateSpecialOffers(requestData) {
      return postOldApi("p_v1_UpdateClientSpecialOffers", requestData);
    },

    createOtherDetails(requestData) {
      return postOldApi("p_v1_CreateClientOtherDetails", requestData);
    },

    updateOtherDetails(requestData) {
      return postOldApi("p_v1_UpdateClientOtherDetails", requestData);
    },

    createProductAndServices(requestData) {
      return postOldApi("p_v1_CreateClientProductAndServices", requestData);
    },

    updateProductAndServices(requestData) {
      return postOldApi("p_v1_UpdateClientProductAndServices", requestData);
    },

    /**
     * Get Account Transactions
     * @param {object} requestData - { OurBranchID, AccountID, FromDate, ToDate, OperatorID }
     */
    getAccountTransactions(requestData) {
      return postOldApi("p_GetAccountTransactions", requestData);
    },

    /**
     * Legacy method for backward compatibility
     * @deprecated Use getSystemCode from LookupService instead
     */
    getSystemCode(payload) {
      console.warn("ClientService.getSystemCode is deprecated. Use LookupService.getSystemCode instead.");
      // Support old format where payload might have RequestData wrapper
      const requestData = payload.RequestData || payload;
      return postOldApi("GetSystemCode", requestData);
    },

    /**
     * Legacy method for backward compatibility
     * @deprecated Use searchClients from LookupService instead
     */
    searchClients(payload) {
      console.warn("ClientService.searchClients is deprecated. Use LookupService.searchClients instead.");
      // Support old format where payload might have RequestData wrapper
      const requestData = payload.RequestData || payload;
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetSearchResult", requestData);
      envelope.RequestTime = formatRequestTime(new Date());
      const SYSTEM_CODES_BASE_URL = (Environment.baseUrlSystemCodes || "http://localhost:5059").replace(/\/+$/, "");
      return CoreApi.post(`${SYSTEM_CODES_BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Client 360 / Member 360 View
     * @param {object} requestData - { OurBranchID, ClientID, OperatorID }
     * @returns {Promise<{success:boolean, code:string, message:string, raw:any, data:any}>}
     */
    viewClient360(requestData) {
      return rawPostOldApi("dbo.p_GetMember360", requestData, "PROJECT_KAIRO");
    },

    /**
     * Validate Client ID for Client 360 by resolving ID -> Name (OldAPI)
     * Calls dbo.p_GetIDDescription
     * Expected response: { Details: [ { Name: string } ] } or { Details: [] }
     *
     * @param {object} requestData - { OurBranchID, ControlTypeID:'ClientID', ID, BankID, TypeID, AdvanceFilter, LanguageID }
     * @returns {Promise<Object>} Normalized response from OldAPI
     */
    validateClient360(requestData) {
      const PROC = 'dbo.p_GetIDDescription';
      const envelope = {
        RequestID: PROC,
        FormId: PROC,
        RequestData: requestData || {},
        RequestTime: formatRequestTime(new Date()),
        AppName: 'PROJECT_KAIRO',
        Checksum: ''
      };

      return CoreApi.post(OLD_API_ENDPOINT, envelope);
    },

    /**
     * Get Customer Query details
     * @param {Object} requestData - { OurBranchID, ClientID, OperatorID }
     * @returns {Promise<Object>}
     */
    getCustomerQuery(requestData) {
      const formId = "dbo.p_GetCustomerQuery";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    //Data Entry Methods

    getClientAddressDetails(requestData) {
      const formId = "dbo.p_GetClientAddress";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    addEditClientAddress(requestData) {
      const formId = "dbo.p_AddEditClientAddress";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    deleteClientAddress(requestData) {
      const formId = "dbo.p_DeleteClientAddress";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    getClientIntroducer(requestData) {
      const formId = "dbo.p_GetClientIntroducer";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    addEditClientIntroducer(requestData) {
      const formId = "dbo.p_AddEditClientIntroducer";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    deleteClientIntroducer(requestData) {
      const formId = "dbo.p_DeleteClientIntroducer";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    getClientBankAccounts(requestData) {
      const formId = "dbo.p_GetClientBankAccounts";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    searchClearingBanks(requestData = {}) {
      const formId = "dbo.pc_SearchClearingBanks";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData, "PROJECT_KAIRO");
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    getClientMaintenanceRelation(requestData) {
      const formId = "dbo.p_GetClientRelations";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData, "PROJECT_KAIRO");
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    addEditClientRelation(requestData) {
      const formId = "dbo.p_AddEditClientRelations";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData, "PROJECT_KAIRO");
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    deleteClientRelation(requestData) {
      const formId = "dbo.p_DeleteClientRelations";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    saveClientBankAccount(requestData) {
      console.log("requestData", requestData);
      const formId = "dbo.p_AddEditClientBankAccounts";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData, "PROJECT_KAIRO");
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    getClientProfileChange(requestData) {
      const formId = "dbo.p_GetClientName";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData, "PROJECT_KAIRO");
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    updateClientProfileChange(requestData) {
      const formId = "dbo.p_EditClientName";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData, "PROJECT_KAIRO");
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    getClientIdentityTypes(requestData) {
      const formId = "dbo.p_GetClientIdentityType";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData, "PROJECT_KAIRO");
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    getDemiseDetails(requestData) {
      const formId = "dbo.p_GetClientDemiseDetails";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData, "PROJECT_KAIRO");
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    saveDemiseDetails(requestData) {
      const formId = "dbo.p_AddEditClientDemiseDetails";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData, "PROJECT_KAIRO");
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    addEditClientIdentityTypes(requestData) {
      const formId = "dbo.p_AddEditClientIdentityTypes";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData, "PROJECT_KAIRO");
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    getSearchResult(requestData) {
      const formId = "dbo.p_GetSearchResult";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData, "PROJECT_KAIRO");
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    uploadClientImage(requestData) {
      // Assuming generic image save procedure or similar
      const formId = "dbo.p_SaveImage";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData, "PROJECT_KAIRO");
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },


    // ============================================================
    // CLIENT APPROVAL METHODS
    // ============================================================

    /**
     * Get clients pending approval
     * @param {object} requestData - { OurBranchID, LogInBranchID, GroupID, OperatorID, ClientTypeID, ClientID }
     * @returns {Promise} Normalized response
     */
    getGroupClientApproval(requestData) {
      return rawPostOldApi("p_GetGroupClientApproval", requestData);
    },

    /**
     * Approve clients
     * @param {object} requestData - { OurBranchID, ApprovedBy, ApprovedOn, DetailRecords (xml) }
     * @returns {Promise} Normalized response
     */
    approveClients(requestData) {
      return rawPostOldApi("dbo.p_GroupClientApproval", requestData);
    },

    /**
     * Reject clients
     * @param {object} requestData - { OurBranchID, RejectedReason, RejectedBy, DetailRecords (xml) }
     * @returns {Promise} Normalized response
     */
    rejectClients(requestData) {
      return rawPostOldApi("dbo.p_GroupClientReject", requestData);
    },

    /**
     * Add client supervision data (called after successful approval)
     * @param {object} requestData - { OurBranchID, ModuleID, LockModuleID, OperatorID, Searchkey, LockKey, EventID, NewData, OldData, Remarks, NewRecord, IPAddress }
     * @returns {Promise} Normalized response
     */
    addClientSupervisionData(requestData) {
      return rawPostOldApi("dbo.p_AddClientSupervisionData", requestData);
    },

    /**
     * Get client details (for supervision newdata/olddata)
     * @param {object} requestData - { ClientID }
     * @returns {Promise} Normalized response
     */
    getClientDetails(requestData) {
      return rawPostOldApi("p_GetClientDetails", requestData);
    },

    // ============================================================
    // CLIENT SUPERVISION METHODS
    // ============================================================

    /**
     * Get branch list for supervision
     * @param {object} requestData - { OperatorID }
     * @returns {Promise} Normalized response
     */
    getBranchList(requestData) {
      return rawPostOldApi("p_getBranchList", requestData);
    },

    /**
     * Get pending client supervisions
     * @param {object} requestData - { OurBranchID, OperatorID, MainModuleID, BranchList }
     * @returns {Promise} Normalized response
     */
    getClientSupervisionPending(requestData) {
      return rawPostOldApi("p_getclientsupervisionpending", requestData);
    },

    /**
     * Approve client supervision
     * @param {object} requestData - { OurBranchID, ClientID, ApprovedBy, strSearchKey }
     * @returns {Promise} Normalized response
     */
    approveClientSupervision(requestData) {
      return rawPostOldApi("p_ClientApproveSupervision", requestData);
    },

    /**
     * Reject client supervision
     * @param {object} requestData - { OurBranchID, ClientID, OperatorID, strSearchkey, RejectReson }
     * @returns {Promise} Normalized response
     */
    rejectClientSupervision(requestData) {
      return rawPostOldApi("p_ClientRejectSupervision", requestData);
    },
  };

  global.ClientService = ClientService;
})(window);