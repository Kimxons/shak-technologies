(function (global) {
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};

  if (!CoreApi) {
    console.error(
      "CoreApi is not loaded. Ensure services/shared/coreApi.js is included before otherStaticDataService.js."
    );
    return;
  }

  // Other Static Data uses the common base URL
  const BASE_URL = (
    Environment.baseUrlCommon ||
    Environment.baseUrlSystemCodes ||
    "http://localhost:5059"
  ).replace(/\/+$/g, "");

  const OLD_API_ENDPOINT = `${BASE_URL}/api/OldAPI`;
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
   * Generic helper for Other Static Data screens that talk to OldAPI.
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

    return CoreApi.post(OLD_API_ENDPOINT, envelope);
  }

  /**
   * Specialized helper for V8 stored procedures.
   * V8 SPs take a single @RequestData VARCHAR(MAX) parameter containing JSON.
   * We pass RequestData as a JSON string to ensure proper handling.
   */
  function postV8Api(formID, requestData = {}, appName = null) {
    const envelope = {
      RequestID: formID,
      FormID: formID,
      FormId: formID,
      // V8 SPs expect RequestData as stringified JSON
      RequestData: JSON.stringify(requestData),
      RequestTime: formatLegacyRequestTime(),
      AppName: appName || APP_NAME,
      Checksum: ""
    };

    console.log('📦 V8 API Envelope:', envelope);
    return CoreApi.post(OLD_API_ENDPOINT, envelope);
  }

  const svc = (global.OtherStaticDataService = global.OtherStaticDataService || {});

  // Base helpers
  svc.postOldApi = postOldApi;
  svc.postV8Api = postV8Api;

  // ============================
  // Banks
  // ============================
  /**
   * Get Banks
   * @param {Object} requestData - { BankID, OurBranchID, OperatorID, Direction }
   * @returns {Promise}
   */
  svc.getBanks = function getBanks(requestData) {
    console.log('🏦 OtherStaticDataService.getBanks called with:', requestData);
    console.log('🌐 API Endpoint:', OLD_API_ENDPOINT);
    const result = postOldApi("dbo.p_GetBanks", requestData || {}, APP_NAME);
    result.then(response => {
      console.log('🏦 getBanks response:', response);
    }).catch(error => {
      console.error('🏦 getBanks error:', error);
    });
    return result;
  };

  /**
   * Add or Edit Bank
   * @param {Object} payload - Bank details
   * @param {string} payload.BankID - Bank ID
   * @param {string} payload.InstitutionTypeID - Institution Type (e.g., 'B' for Bank)
   * @param {string} payload.BankName - Full bank name
   * @param {string} payload.ShortName - Short name/abbreviation
   * @param {string} payload.ClientID - Associated client ID
   * @param {number} payload.CreditRating - Credit rating
   * @param {boolean|number} payload.IsLocalClearingBank - Is local clearing bank (0/1 or true/false)
   * @param {boolean|number} payload.IsForeignClearingBank - Is foreign clearing bank (0/1 or true/false)
   * @param {string} payload.ClearingThrough - Clearing bank ID
   * @param {string} payload.ClearingAccountID - Clearing account ID
   * @param {string} payload.BankAccountID - Bank account ID
   * @param {number} payload.NewRecord - Is new record (0/1)
   * @param {string} payload.OperatorID - Operator ID
   * @param {string} payload.OurBranchID - Branch ID
   * @returns {Promise}
   */
  svc.addEditBank = function addEditBank(payload) {
    console.log('💾 OtherStaticDataService.addEditBank called with:', payload);
    console.log('🌐 API Endpoint:', OLD_API_ENDPOINT);

    const result = postOldApi("dbo.p_AddEditBanks", payload || {}, APP_NAME);
    result.then(response => {
      console.log('💾 addEditBank response:', response);
    }).catch(error => {
      console.error('💾 addEditBank error:', error);
    });
    return result;
  };

  /**
   * Delete Bank
   * @param {Object} payload - Delete parameters
   * @param {string} payload.BankID - Bank ID to delete
   * @param {number} payload.NewRecord - New record flag (0/1)
   * @returns {Promise}
   */
  svc.deleteBank = function deleteBank(payload) {
    console.log('🗑️ OtherStaticDataService.deleteBank called with:', payload);
    console.log('🌐 API Endpoint:', OLD_API_ENDPOINT);

    const result = postOldApi("dbo.p_DeleteBanks", payload || {}, APP_NAME);
    result.then(response => {
      console.log('🗑️ deleteBank response:', response);
    }).catch(error => {
      console.error('🗑️ deleteBank error:', error);
    });
    return result;
  };

  // ============================
  // Clearing Branches
  // ============================
  /**
   * Get Clearing Branches
   * @param {Object} requestData - { BankID, BranchID, OurBranchID, OperatorID, Direction }
   * @returns {Promise}
   */
  svc.getBranches = function getBranches(requestData) {
    console.log('🏢 OtherStaticDataService.getBranches called with:', requestData);
    console.log('🌐 API Endpoint:', OLD_API_ENDPOINT);
    const result = postOldApi("dbo.p_GetBranches", requestData || {}, APP_NAME);
    result.then(response => {
      console.log('🏢 getBranches response:', response);
    }).catch(error => {
      console.error('🏢 getBranches error:', error);
    });
    return result;
  };

  /**
   * Add or Edit Clearing Branch
   * @param {Object} payload - Branch details
   * @param {string} payload.BankID - Bank ID
   * @param {string} payload.BranchID - Branch ID
   * @param {string} payload.BranchTypeID - Branch Type ID
   * @param {string} payload.BranchName - Branch name
   * @param {string} payload.Address1 - Address line 1
   * @param {string} payload.Address2 - Address line 2
   * @param {string} payload.CityID - City ID
   * @param {string} payload.CountryID - Country ID
   * @param {string} payload.ZipCode - Zip/Postal code
   * @param {string} payload.Phone1 - Phone number 1
   * @param {string} payload.Phone2 - Phone number 2
   * @param {string} payload.Mobile - Mobile number
   * @param {string} payload.Fax - Fax number
   * @param {string} payload.EMail - Email address
   * @param {string} payload.ContactPerson1 - Contact person 1
   * @param {string} payload.ContactPerson2 - Contact person 2
   * @param {string} payload.ourBranchID - Our branch ID
   * @param {string} payload.Remarks - Remarks
   * @param {boolean|number} payload.IsUpcountry - Is upcountry branch (0/1)
   * @param {string} payload.ClearingCenter - Clearing center
   * @param {string} payload.SWIFTCode - SWIFT code
   * @param {string} payload.CreatedBy - Created by operator ID
   * @param {string} payload.CreatedOn - Created on timestamp
   * @param {string} payload.ModifiedBy - Modified by operator ID
   * @param {string} payload.ModifiedOn - Modified on timestamp
   * @param {string} payload.SupervisedBy - Supervised by operator ID
   * @param {number} payload.NewRecord - Is new record (0/1)
   * @returns {Promise}
   */
  svc.addEditBranch = function addEditBranch(payload) {
    console.log('💾 OtherStaticDataService.addEditBranch called with:', payload);
    console.log('🌐 API Endpoint:', OLD_API_ENDPOINT);

    const result = postOldApi("dbo.p_AddEditBranches", payload || {}, APP_NAME);
    result.then(response => {
      console.log('💾 addEditBranch response:', response);
    }).catch(error => {
      console.error('💾 addEditBranch error:', error);
    });
    return result;
  };

  /**
   * Delete Clearing Branch
   * @param {Object} payload - Delete parameters
   * @param {string} payload.OurBranchID - Our branch ID
   * @param {string} payload.BankID - Bank ID
   * @param {string} payload.BranchID - Branch ID to delete
   * @param {number} payload.NewRecord - New record flag (0/1)
   * @returns {Promise}
   */
  svc.deleteBranch = function deleteBranch(payload) {
    console.log('🗑️ OtherStaticDataService.deleteBranch called with:', payload);
    console.log('🌐 API Endpoint:', OLD_API_ENDPOINT);

    const result = postOldApi("dbo.p_DeleteBranches", payload || {}, APP_NAME);
    result.then(response => {
      console.log('🗑️ deleteBranch response:', response);
    }).catch(error => {
      console.error('🗑️ deleteBranch error:', error);
    });
    return result;
  };

  // ============================
  // Bank Signatories
  // ============================
  /**
   * Get Bank Signatories
   * @param {Object} requestData - { BankID, OurBranchID, SignatoryID, OperatorID, Direction }
   * @returns {Promise}
   */
  svc.getBankSignatories = function getBankSignatories(requestData) {
    console.log('✍️ OtherStaticDataService.getBankSignatories called with:', requestData);
    console.log('🌐 API Endpoint:', OLD_API_ENDPOINT);

    const result = postOldApi("dbo.p_GetBankSignatories", requestData || {}, APP_NAME);
    result.then(response => {
      console.log('✍️ getBankSignatories response:', response);
    }).catch(error => {
      console.error('✍️ getBankSignatories error:', error);
    });
    return result;
  };

  /**
   * Add or Edit Bank Signatory
   * @param {Object} payload - Signatory details
   * @param {string} payload.BankID - Bank ID
   * @param {string} payload.SignatoryID - Signatory/Client ID
   * @param {string} payload.SignatoryName - Signatory name
   * @param {number|string} payload.ImageID - Image ID (bigint)
   * @param {string} payload.CreatedBy - Created by operator ID
   * @param {string} payload.CreatedOn - Created on timestamp (smalldatetime)
   * @param {string} payload.ModifiedBy - Modified by operator ID
   * @param {string} payload.ModifiedOn - Modified on timestamp (smalldatetime)
   * @param {string} payload.SupervisedBy - Supervised by operator ID
   * @param {number} payload.NewRecord - Is new record (0/1, tinyint)
   * @returns {Promise}
   */
  svc.addEditBankSignatory = function addEditBankSignatory(payload) {
    console.log('💾 OtherStaticDataService.addEditBankSignatory called with:', payload);
    console.log('🌐 API Endpoint:', OLD_API_ENDPOINT);

    const result = postOldApi("dbo.p_AddEditBankSignatories", payload || {}, APP_NAME);
    result.then(response => {
      console.log('💾 addEditBankSignatory response:', response);
    }).catch(error => {
      console.error('💾 addEditBankSignatory error:', error);
    });
    return result;
  };

  /**
   * Delete Bank Signatory
   * @param {Object} payload - Delete parameters
   * @param {string} payload.BankID - Bank ID
   * @param {string} payload.SignatoryID - Signatory/Client ID to delete
   * @param {number} payload.NewRecord - New record flag (0/1, tinyint)
   * @returns {Promise}
   */
  svc.deleteBankSignatory = function deleteBankSignatory(payload) {
    console.log('🗑️ OtherStaticDataService.deleteBankSignatory called with:', payload);
    console.log('🌐 API Endpoint:', OLD_API_ENDPOINT);

    const result = postOldApi("dbo.p_DeleteBankSignatories", payload || {}, APP_NAME);
    result.then(response => {
      console.log('🗑️ deleteBankSignatory response:', response);
    }).catch(error => {
      console.error('🗑️ deleteBankSignatory error:', error);
    });
    return result;
  };

  // ============================
  // Client Type Workflow
  // ============================
  /**
   * Get Client Type Workflow
   * @param {Object} requestData - { BankID, WorkFlowID, ID, OurBranchID, OperatorID }
   * @returns {Promise}
   */
  svc.getClientTypeWorkflow = function getClientTypeWorkflow(requestData) {
    console.log('📋 OtherStaticDataService.getClientTypeWorkflow called with:', requestData);
    console.log('🌐 API Endpoint:', OLD_API_ENDPOINT);

    const result = postOldApi("dbo.p_GetClientTypeWorkFlow", requestData || {}, APP_NAME);
    result.then(response => {
      console.log('📋 getClientTypeWorkflow response:', response);
    }).catch(error => {
      console.error('📋 getClientTypeWorkflow error:', error);
    });
    return result;
  };

  /**
   * Edit (Create/Update) Client Type Workflow
   * Uses p_EditClientTypeWorkFlow for both create and update operations
   * @param {Object} payload - { BankID, WorkflowID, OperatedBy, OperatedOn, SupervisedBy, UpdateCount, DetailRecords (XML string) }
   * @returns {Promise}
   */
  svc.editClientTypeWorkflow = function editClientTypeWorkflow(payload) {
    console.log('📋 OtherStaticDataService.editClientTypeWorkflow called with:', payload);
    console.log('🌐 API Endpoint:', OLD_API_ENDPOINT);

    const result = postOldApi("dbo.p_EditClientTypeWorkFlow", payload || {}, APP_NAME);
    result.then(response => {
      console.log('📋 editClientTypeWorkflow response:', response);
    }).catch(error => {
      console.error('📋 editClientTypeWorkflow error:', error);
    });
    return result;
  };

  /**
   * Create Client Type Workflow (alias for editClientTypeWorkflow)
   * @param {Object} payload
   * @returns {Promise}
   */
  svc.createClientTypeWorkflow = function createClientTypeWorkflow(payload) {
    return svc.editClientTypeWorkflow(payload);
  };

  /**
   * Update Client Type Workflow (alias for editClientTypeWorkflow)
   * @param {Object} payload
   * @returns {Promise}
   */
  svc.updateClientTypeWorkflow = function updateClientTypeWorkflow(payload) {
    return svc.editClientTypeWorkflow(payload);
  };

  /**
   * Delete Client Type Workflow
   * @param {Object} payload - Delete parameters
   * @param {string} payload.WorkFlowID - Workflow ID to delete
   * @param {string} payload.OperatorID - Operator ID
   * @param {string} payload.OurBranchID - Branch ID
   * @returns {Promise}
   */
  svc.deleteClientTypeWorkflow = function deleteClientTypeWorkflow(payload) {
    console.log('🗑️ OtherStaticDataService.deleteClientTypeWorkflow called with:', payload);
    console.log('🌐 API Endpoint:', OLD_API_ENDPOINT);

    const result = postV8Api("dbo.p_V8_DeleteClientTypeWorkFlow", payload || {}, APP_NAME);
    result.then(response => {
      console.log('🗑️ deleteClientTypeWorkflow response:', response);
    }).catch(error => {
      console.error('🗑️ deleteClientTypeWorkflow error:', error);
    });
    return result;
  };

  // ============================
  // Bank Limit Maintenance
  // ============================
  /**
   * Get Bank Limit
   * @param {Object} requestData - Request parameters
   * @param {string} requestData.BankID - Bank ID
   * @param {string} requestData.ClientBranchID - Client Branch ID
   * @param {string} requestData.ClientID - Client ID
   * @param {string} requestData.LimitType - Limit Type (SystemSubID)
   * @param {string} requestData.OperatorID - Operator ID
   * @param {string} requestData.CurrencyID - Currency ID
   * @returns {Promise}
   */
  svc.getBankLimit = function getBankLimit(requestData) {
    console.log('💰 OtherStaticDataService.getBankLimit called with:', requestData);
    console.log('🌐 API Endpoint:', OLD_API_ENDPOINT);
    const result = postOldApi("dbo.p_GetBankLimit", requestData || {}, APP_NAME);
    result.then(response => {
      console.log('💰 getBankLimit response:', response);
    }).catch(error => {
      console.error('💰 getBankLimit error:', error);
    });
    return result;
  };

  /**
   * Add or Edit Bank Limit
   * @param {Object} payload - Bank limit details
   * @param {string} payload.BankID - Bank ID
   * @param {string} payload.ClientID - Client ID
   * @param {string} payload.LimitType - Limit Type (SystemSubID)
   * @param {string} payload.CurrencyID - Currency ID
   * @param {string} payload.CreatedBy - Created by operator ID
   * @param {string} payload.CreatedOn - Created on timestamp (smalldatetime)
   * @param {string} payload.ModifiedBy - Modified by operator ID
   * @param {string} payload.ModifiedOn - Modified on timestamp (smalldatetime)
   * @param {string} payload.SupervisedBy - Supervised by operator ID
   * @param {string} payload.SupervisedOn - Supervised on timestamp (smalldatetime)
   * @param {number} payload.UpdateCount - Update count for optimistic concurrency (tinyint)
   * @param {string} payload.DetailRecords - XML string containing detail records
   * @returns {Promise}
   */
  svc.addEditBankLimit = function addEditBankLimit(payload) {
    console.log('💾 OtherStaticDataService.addEditBankLimit called with:', payload);
    console.log('🌐 API Endpoint:', OLD_API_ENDPOINT);

    const result = postOldApi("dbo.p_AddEditBankLimit", payload || {}, APP_NAME);
    result.then(response => {
      console.log('💾 addEditBankLimit response:', response);
    }).catch(error => {
      console.error('💾 addEditBankLimit error:', error);
    });
    return result;
  };

  /**
   * Delete Bank Limit
   * @param {Object} payload - Delete parameters
   * @param {string} payload.BankID - Bank ID
   * @param {string} payload.ClientBranchID - Client Branch ID
   * @param {string} payload.ClientID - Client ID
   * @param {string} payload.LimitType - Limit Type (SystemSubID)
   * @param {number} payload.UpdateCount - Update count for optimistic concurrency (tinyint)
   * @returns {Promise}
   */
  svc.deleteBankLimit = function deleteBankLimit(payload) {
    console.log('🗑️ OtherStaticDataService.deleteBankLimit called with:', payload);
    console.log('🌐 API Endpoint:', OLD_API_ENDPOINT);
    const result = postOldApi("dbo.p_DeleteBankLimit", payload || {}, APP_NAME);
    result.then(response => {
      console.log('🗑️ deleteBankLimit response:', response);
    }).catch(error => {
      console.error('🗑️ deleteBankLimit error:', error);
    });
    return result;
  };

  // ============================
  // Client Type Workflow
  // ============================
  /**
   * Get Client Type Workflow
   * @param {Object} requestData - Request parameters
   * @param {string} requestData.BankID - Bank ID
   * @param {string} requestData.WorkFlowID - Workflow ID
   * @param {string} requestData.ID - System code ID (e.g., 'WFIClientTypeID')
   * @param {string} requestData.OurBranchID - Branch ID
   * @param {string} requestData.OperatorID - Operator ID
   * @returns {Promise}
   */
  svc.getClientTypeWorkflow = function getClientTypeWorkflow(requestData) {
    console.log('📋 OtherStaticDataService.getClientTypeWorkflow called with:', requestData);
    console.log('🌐 API Endpoint:', OLD_API_ENDPOINT);
    const result = postOldApi("dbo.p_GetClientTypeWorkFlow", requestData || {}, APP_NAME);
    result.then(response => {
      console.log('📋 getClientTypeWorkflow response:', response);
    }).catch(error => {
      console.error('📋 getClientTypeWorkflow error:', error);
    });
    return result;
  };

  /**
   * Edit Client Type Workflow
   * @param {Object} payload - Workflow details
   * @param {string} payload.BankID - Bank ID
   * @param {string} payload.WorkflowID - Workflow ID
   * @param {string} payload.OperatedBy - Operator ID
   * @param {string} payload.OperatedOn - Operated on timestamp
   * @param {string} payload.SupervisedBy - Supervised by operator ID
   * @param {number} payload.UpdateCount - Update count for optimistic concurrency
   * @param {string} payload.DetailRecords - XML string containing detail records
   * @returns {Promise}
   */
  svc.editClientTypeWorkflow = function editClientTypeWorkflow(payload) {
    console.log('💾 OtherStaticDataService.editClientTypeWorkflow called with:', payload);
    console.log('🌐 API Endpoint:', OLD_API_ENDPOINT);

    const result = postOldApi("dbo.p_EditClientTypeWorkFlow", payload || {}, APP_NAME);
    result.then(response => {
      console.log('💾 editClientTypeWorkflow response:', response);
    }).catch(error => {
      console.error('💾 editClientTypeWorkflow error:', error);
    });
    return result;
  };
})(window);
