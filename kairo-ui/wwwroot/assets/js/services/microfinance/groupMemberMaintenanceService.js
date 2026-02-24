(function (global) {
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};

  if (!CoreApi) {
    console.error("CoreApi is not loaded. Ensure shared/coreApi.js is included before groupMemberMaintenanceService.js.");
    return;
  }

  const BASE_URL = (Environment.baseUrlMicroFinance || "http://localhost:XXXX").replace(/\/+$/, "");
  const ENDPOINT = `${BASE_URL}/api/OldAPI`;

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

  function extractRows(result) {
    const candidates = [result?.data, result?.Details, result].filter(Boolean);
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) return candidate;

      const nested =
        candidate?.Details?.SearchResults ||
        candidate?.Details ||
        candidate?.SearchResults ||
        candidate;

      if (Array.isArray(nested)) return nested;
      if (Array.isArray(nested?.SearchResults)) return nested.SearchResults;
      if (Array.isArray(nested?.Details)) return nested.Details;
    }
    return [];
  }

  const GroupMemberMaintenanceService = {
    /**
     * Search Group ClientID
     * @param {object} params { operatorId, branchId }
     * @returns {Promise<Array>} Array of client/group results
     */
    async searchGroupClientID({ operatorId, branchId }) {
      const formId = "dbo.p_GetSearchResult";
      const requestData = {
        TableID: "GroupClientID",
        AdvFilterString: "",
        WhereStmt: "",
        PrevOrNext: "0",
        RefID: "",
        OperatorID: operatorId,
        ModuleID: "5080",
        OurBranchID: branchId || Environment.OurBranchID || "",
        SearchKey: "",
        LanguageID: "en"
      };

      // Use CoreApi envelope to match other services; keep RequestTime formatting aligned with OldAPI samples.
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData, Environment.appName || "PROJECT_KAIRO");
      envelope.RequestTime = formatRequestTime(new Date());
      // Backward compatibility for servers expecting FormId casing
      envelope.FormId = envelope.FormID;

      const resp = await CoreApi.post(ENDPOINT, envelope);
      return extractRows(resp);
    },

    /**
     * Fetch group members for a given client.
     */
    async getGroupMembers({ clientId, branchId, operatorId, refId = "", series = "", direction = "0" }) {
      const formId = "dbo.p_GetGroupMembers";

      if (!clientId) {
        throw new Error("clientId is required to fetch group members");
      }

      const requestData = {
        ClientID: String(clientId).trim(),
        OurBranchID: String(branchId || Environment.OurBranchID || "").trim(),
        RefID: String(refId ?? ""),
        Series: String(series ?? ""),
        OperatorID: String(operatorId ?? ""),
        Direction: String(direction ?? "0")
      };

      const envelope = CoreApi.makeRequestEnvelope(formId, requestData, Environment.appName || "PROJECT_KAIRO");
      envelope.RequestTime = formatRequestTime(new Date());
      envelope.FormId = formId;
      envelope.RequestID = formId;

      const resp = await CoreApi.post(ENDPOINT, envelope);

      const members = Array.isArray(resp?.data?.Details01)
        ? resp.data.Details01
        : Array.isArray(resp?.Details01)
          ? resp.Details01
          : [];

      const meta = Array.isArray(resp?.data?.Details) ? resp.data.Details : resp?.Details || null;

      return {
        success: resp?.success !== false,
        message: resp?.message || "",
        members,
        meta,
        raw: resp
      };
    },

    /**
     * Search centers/groups by GroupID scoped to branch.
     */
    async searchGroupID({ branchId, operatorId, centerId }) {
      const formId = "dbo.p_GetSearchResult";
      const advFilter = branchId
        ? `OurBranchID='${String(branchId).trim()}'${centerId ? ` AND GroupID='${String(centerId).trim()}'` : ""}`
        : centerId
          ? `GroupID='${String(centerId).trim()}'`
          : "";

      const requestData = {
        TableID: "GroupID",
        AdvFilterString: advFilter,
        WhereStmt: "",
        PrevOrNext: "0",
        RefID: "",
        OperatorID: String(operatorId ?? ""),
        ModuleID: "5080",
        OurBranchID: String(branchId || Environment.OurBranchID || "").trim(),
        SearchKey: "",
        LanguageID: "en"
      };

      const envelope = CoreApi.makeRequestEnvelope(formId, requestData, Environment.appName || "PROJECT_KAIRO");
      envelope.RequestTime = formatRequestTime(new Date());
      envelope.FormId = formId;
      envelope.RequestID = formId;

      const resp = await CoreApi.post(ENDPOINT, envelope);
      return extractRows(resp);
    },

    /**
     * Search sub-groups by GroupID scoped to branch.
     */
    async searchSubGroupID({ branchId, operatorId, centerId }) {
      const formId = "dbo.p_GetSearchResult";
      const advFilter = `OurBranchID='${String(branchId || Environment.OurBranchID || "").trim()}'${centerId ? ` AND GroupID= '${String(centerId).trim()}'` : ""}`;

      const requestData = {
        TableID: "SubGroupID",
        AdvFilterString: advFilter,
        WhereStmt: "",
        PrevOrNext: "0",
        RefID: "",
        OperatorID: String(operatorId ?? ""),
        ModuleID: "5080",
        OurBranchID: String(branchId || Environment.OurBranchID || "").trim(),
        SearchKey: "",
        LanguageID: "en"
      };

      const envelope = CoreApi.makeRequestEnvelope(formId, requestData, Environment.appName || "PROJECT_KAIRO");
      envelope.RequestTime = formatRequestTime(new Date());
      envelope.FormId = formId;
      envelope.RequestID = formId;

      const resp = await CoreApi.post(ENDPOINT, envelope);
      return extractRows(resp);
    },

    /**
     * Search Group Loan Scheme IDs (used by Center Member Scheme in Add mode).
     * Filters by OurBranchID + GroupID and excludes an already-assigned LoanSchemeID.
     *
     * @param {object} params
     * @param {string} params.branchId Logged in branch id (OurBranchID)
     * @param {string} params.operatorId Operator id
     * @param {string} params.centerId Center/GroupID from master screen
     * @param {string} [params.excludeLoanSchemeId] LoanSchemeID to exclude (already assigned)
     * @returns {Promise<Array>} Array of schemes { LoanSchemeID, Description, ... }
     */
    async searchSchemeID({ branchId, operatorId, centerId, excludeLoanSchemeId = '' }) {
      const formId = 'dbo.p_GetSearchResult';

      const branchIdValue = String(branchId || Environment.OurBranchID || '').trim();
      const operatorIdValue = String(operatorId || '').trim();
      const centerIdValue = String(centerId || '').trim();
      const excludeValue = String(excludeLoanSchemeId || '').trim();

      const advFilterParts = [];
      if (branchIdValue) advFilterParts.push(`OurBranchID='${branchIdValue}'`);
      if (centerIdValue) advFilterParts.push(`GroupID='${centerIdValue}'`);
      if (excludeValue) advFilterParts.push(`LoanSchemeID <> '${excludeValue}'`);
      const advFilter = advFilterParts.join(' And ');

      const requestData = {
        TableID: 'GroupLoanSchemeID',
        AdvFilterString: advFilter,
        WhereStmt: '',
        PrevOrNext: '0',
        RefID: '1',
        OperatorID: operatorIdValue,
        ModuleID: '5080',
        OurBranchID: branchIdValue,
        SearchKey: '',
        LanguageID: 'en'
      };

      const envelope = CoreApi.makeRequestEnvelope(formId, requestData, Environment.appName || 'PROJECT_KAIRO');
      envelope.RequestTime = formatRequestTime(new Date());
      envelope.FormId = formId;
      envelope.RequestID = formId;
      envelope.Checksum = '';

      const resp = await CoreApi.post(ENDPOINT, envelope);
      return extractRows(resp);
    },

    /**
     * Get Group Product Details
     * @param {object} params { groupId, branchId }
     * @returns {Promise<object>} Group product details or null if not found
     */
    async getGroupProductDetails({ groupId, branchId }) {
      const formId = "dbo.p_GetGroupProductDetails";

      if (!groupId) {
        throw new Error("groupId is required to fetch group product details");
      }

      const requestData = {
        OurBranchID: String(branchId || Environment.OurBranchID || "").trim(),
        GroupID: String(groupId).trim()
      };

      const envelope = CoreApi.makeRequestEnvelope(formId, requestData, Environment.appName || "PROJECT_KAIRO");
      envelope.RequestTime = formatRequestTime(new Date());
      envelope.FormId = formId;
      envelope.RequestID = formId;
      envelope.Checksum = "";

      const resp = await CoreApi.post(ENDPOINT, envelope);

      // Extract details from response
      const details = Array.isArray(resp?.Details) ? resp.Details[0] : null;

      if (!details) {
        return {
          success: false,
          message: "Group Product Details Not found",
          details: null,
          raw: resp
        };
      }

      return {
        success: true,
        message: "Group Product Details retrieved successfully",
        details: {
          maxGroupLoans: details.MaxGroupLoans,
          maxGroupLoanLimit: details.MaxGroupLoanLimit,
          maxOtherLoans: details.MaxLoans,
          maxOtherLoanLimit: details.MaxLoanLimit,
          formationDate: details.FormationDate
        },
        raw: resp
      };
    },

    /**
     * Validate Center ID and retrieve center details
     * @param {object} params { centerId, branchId, bankId }
     * @returns {Promise<object>} Center details or validation result
     */
    async validateCenterID({ centerId, branchId, bankId }) {
      const formId = "dbo.p_GetIDDescription";

      if (!centerId) {
        throw new Error("centerId is required to validate center ID");
      }

      const bankIdValue = String(bankId || Environment.defaultBankId || "").trim();
      const branchIdValue = String(branchId || Environment.OurBranchID || "").trim();
      const centerIdValue = String(centerId).trim();

      const requestData = {
        OurBranchID: branchIdValue,
        ControlTypeID: "GroupID",
        ID: centerIdValue,
        BankID: bankIdValue,
        TypeID: "",
        AdvanceFilter: `GroupID='${centerIdValue}' AND OurBranchID='${branchIdValue}'`,
        LanguageID: "en"
      };

      const envelope = CoreApi.makeRequestEnvelope(formId, requestData, Environment.appName || "PROJECT_KAIRO");
      envelope.RequestTime = formatRequestTime(new Date());
      envelope.FormId = formId;
      envelope.RequestID = formId;
      envelope.Checksum = "";

      const resp = await CoreApi.post(ENDPOINT, envelope);

      // Extract details from response
      const details = Array.isArray(resp?.Details) ? resp.Details[0] : null;

      if (!details) {
        return {
          success: false,
          message: "Invalid Center ID",
          details: null,
          raw: resp
        };
      }

      return {
        success: true,
        message: "Center ID validated successfully",
        details: {
          groupName: details.GroupName
        },
        raw: resp
      };
    },

    /**
     * Validate Sub Group ID and retrieve sub group details
     * @param {object} params { subGroupId, centerId, branchId, bankId }
     * @returns {Promise<object>} Sub group details or validation result
     */
    async validateSubGroupID({ subGroupId, centerId, branchId, bankId }) {
      const formId = "dbo.p_GetIDDescription";

      if (!subGroupId) {
        throw new Error("subGroupId is required to validate sub group ID");
      }

      const bankIdValue = String(bankId || Environment.defaultBankId || "").trim();
      const branchIdValue = String(branchId || Environment.OurBranchID || "").trim();
      const subGroupIdValue = String(subGroupId).trim();
      const centerIdValue = String(centerId || "").trim();

      const requestData = {
        OurBranchID: branchIdValue,
        ControlTypeID: "SubGroupID",
        ID: subGroupIdValue,
        BankID: bankIdValue,
        TypeID: "",
        AdvanceFilter: `GroupID='${centerIdValue}' AND OurBranchID='${branchIdValue}'`,
        LanguageID: "en"
      };

      const envelope = CoreApi.makeRequestEnvelope(formId, requestData, Environment.appName || "PROJECT_KAIRO");
      envelope.RequestTime = formatRequestTime(new Date());
      envelope.FormId = formId;
      envelope.RequestID = formId;
      envelope.Checksum = "";

      const resp = await CoreApi.post(ENDPOINT, envelope);

      // Extract details from response
      const details = Array.isArray(resp?.Details) ? resp.Details[0] : null;

      if (!details) {
        return {
          success: false,
          message: "Invalid Group ID",
          details: null,
          raw: resp
        };
      }

      return {
        success: true,
        message: "Group ID validated successfully",
        details: {
          subGroupId: details.SubGroupID
        },
        raw: resp
      };
    },

    /**
     * Validate Client ID without Group (for Add mode)
     * @param {object} params { clientId, branchId, bankId }
     * @returns {Promise<object>} Client details or validation result
     */
    async validateClientWithoutGroup({ clientId, branchId, bankId }) {
      const formId = "dbo.p_GetIDDescription";

      if (!clientId) {
        throw new Error("clientId is required to validate client");
      }

      const bankIdValue = String(bankId || Environment.defaultBankId || "").trim();
      const branchIdValue = String(branchId || Environment.OurBranchID || "").trim();
      const clientIdValue = String(clientId).trim();

      const requestData = {
        OurBranchID: branchIdValue,
        ControlTypeID: "ClientWithoutGroupID",
        ID: clientIdValue,
        BankID: bankIdValue,
        TypeID: "",
        AdvanceFilter: "",
        LanguageID: "en"
      };

      const envelope = CoreApi.makeRequestEnvelope(formId, requestData, Environment.appName || "PROJECT_KAIRO");
      envelope.RequestTime = formatRequestTime(new Date());
      envelope.FormId = formId;
      envelope.RequestID = formId;
      envelope.Checksum = "";

      const resp = await CoreApi.post(ENDPOINT, envelope);

      // Extract details from response
      const details = Array.isArray(resp?.Details) ? resp.Details[0] : null;

      if (!details) {
        return {
          success: false,
          message: "Invalid Non Group Client",
          details: null,
          raw: resp
        };
      }

      return {
        success: true,
        message: "Client validated successfully",
        details: {
          clientName: details.Name
        },
        raw: resp
      };
    },

    /**
     * Validate Client ID with Group (for Browse/Edit mode)
     * @param {object} params { clientId, branchId, bankId }
     * @returns {Promise<object>} Client details or validation result
     */
    async validateClientGroup({ clientId, branchId, bankId }) {
      const formId = "dbo.p_GetIDDescription";

      if (!clientId) {
        throw new Error("clientId is required to validate client");
      }

      const bankIdValue = String(bankId || Environment.defaultBankId || "").trim();
      const branchIdValue = String(branchId || Environment.OurBranchID || "").trim();
      const clientIdValue = String(clientId).trim();

      const requestData = {
        OurBranchID: branchIdValue,
        ControlTypeID: "GroupClientID",
        ID: clientIdValue,
        BankID: bankIdValue,
        TypeID: "",
        AdvanceFilter: "",
        LanguageID: "en"
      };

      const envelope = CoreApi.makeRequestEnvelope(formId, requestData, Environment.appName || "PROJECT_KAIRO");
      envelope.RequestTime = formatRequestTime(new Date());
      envelope.FormId = formId;
      envelope.RequestID = formId;
      envelope.Checksum = "";

      const resp = await CoreApi.post(ENDPOINT, envelope);

      // Extract details from response
      const details = Array.isArray(resp?.Details) ? resp.Details[0] : null;

      if (!details) {
        return {
          success: false,
          message: "Invalid Group Client",
          details: null,
          raw: resp
        };
      }

      return {
        success: true,
        message: "Client validated successfully",
        details: {
          clientName: details.Name
        },
        raw: resp
      };
    },

    /**
     * Save Center Member Maintenance (Add/Edit)
     * @param {object} payload Full request payload with RequestID, FormId, RequestData, RequestTime, AppName, Checksum
     * @returns {Promise<object>} Save result with Details array or error Status
     */
    async saveCenterMemberMaintenance(payload) {
      if (!payload?.RequestData) {
        throw new Error("payload.RequestData is required");
      }

      const resp = await CoreApi.post(ENDPOINT, payload);

      return resp;
    },

    /**
     * Get group member scheme information
     * @param {object} params { clientId, refId, branchId, operatorId, loanSchemeId }
     * @returns {Promise<object>} Group member scheme data
     */
    async getGroupMemberScheme({ clientId, refId, branchId, operatorId }) {
      const formId = "dbo.p_GetGroupMemberScheme";

      if (!clientId) {
        throw new Error("clientId is required to fetch group member scheme");
      }

      const requestData = {
        ClientID: String(clientId).trim(),
        RefID: String(refId ?? "").trim(),
        OurBranchID: String(branchId || Environment.OurBranchID || "").trim(),
        Direction: "0",
        OperatorID: String(operatorId ?? "")
      };

      const envelope = CoreApi.makeRequestEnvelope(formId, requestData, Environment.appName || "PROJECT_KAIRO");
      envelope.RequestTime = formatRequestTime(new Date());
      envelope.FormId = formId;
      envelope.RequestID = formId;

      const resp = await CoreApi.post(ENDPOINT, envelope);

      const schemes = Array.isArray(resp?.data?.Details01)
        ? resp.data.Details01
        : Array.isArray(resp?.Details01)
          ? resp.Details01
          : [];

      const meta = Array.isArray(resp?.data?.Details) ? resp.data.Details : resp?.Details || null;

      return {
        success: resp?.success !== false,
        message: resp?.message || "",
        schemes,
        meta,
        raw: resp
      };

    },

    /**
     * View Group Member Scheme Details
     * Fetches detailed information for a specific scheme including collateral, savings, loan settings.
     * @param {object} params
     * @param {string} params.branchId OurBranchID
     * @param {string} params.clientId ClientID
     * @param {string} params.refId RefID (typically "1")
     * @param {string} params.loanSchemeId LoanSchemeID to fetch details for
     * @param {string} params.operatorId OperatorID
     * @param {string} [params.direction] Direction (default: "0")
     * @returns {Promise<object>} Scheme details with Details01 array
     */
    async viewSchemeDetails({ branchId, clientId, refId, loanSchemeId, operatorId, direction = "0" }) {
      const formId = "dbo.p_GetGroupMemberScheme";

      if (!clientId) {
        throw new Error("clientId is required");
      }
      if (!loanSchemeId) {
        throw new Error("loanSchemeId is required");
      }

      const requestData = {
        OurBranchID: String(branchId || Environment.OurBranchID || "").trim(),
        ClientID: String(clientId).trim(),
        RefID: String(refId ?? "").trim(),
        LoanSchemeID: String(loanSchemeId).trim(),
        Direction: String(direction ?? "0").trim(),
        OperatorID: String(operatorId ?? "").trim()
      };

      const envelope = CoreApi.makeRequestEnvelope(formId, requestData, Environment.appName || "PROJECT_KAIRO");
      envelope.RequestTime = formatRequestTime(new Date());
      envelope.FormId = formId;
      envelope.RequestID = formId;
      envelope.Checksum = "";

      const resp = await CoreApi.post(ENDPOINT, envelope);

      const schemeDetails = Array.isArray(resp?.Details01)
        ? resp.Details01
        : Array.isArray(resp?.data?.Details01)
          ? resp.data.Details01
          : [];

      const meta = Array.isArray(resp?.Details) ? resp.Details : Array.isArray(resp?.data?.Details) ? resp.data.Details : null;

      return {
        success: resp?.success !== false,
        message: resp?.message || "",
        schemeDetails,
        meta,
        raw: resp
      };
    },

    /**
     * Delete Center Member Maintenance
     * @param {object} payload Full request payload with RequestID, FormId, RequestData, RequestTime, AppName, Checksum
     * @returns {Promise<object>} Delete result with Details array or error Status
     */
    async deleteClientMemberMaintenance(payload) {
      if (!payload?.RequestData) {
        throw new Error("payload.RequestData is required");
      }

      const resp = await CoreApi.post(ENDPOINT, payload);

      return resp;
    },

    /**
     * Delete Group Member Scheme
     * @param {object} params
     * @param {string} params.branchId OurBranchID
     * @param {string} params.clientId ClientID
     * @param {string} params.refId RefID
     * @param {string} params.loanSchemeId LoanSchemeID
     * @returns {Promise<object>} Delete result with Details array or error Status
     */
    async removeGroupMemberScheme({ branchId, clientId, refId, loanSchemeId }) {
      const formId = "dbo.p_DeleteGroupMemberScheme";

      if (!clientId) {
        throw new Error("clientId is required");
      }
      if (!loanSchemeId) {
        throw new Error("loanSchemeId is required");
      }

      const requestData = {
        OurBranchID: String(branchId || Environment.OurBranchID || "").trim(),
        ClientID: String(clientId).trim(),
        RefID: String(refId ?? "").trim(),
        LoanSchemeID: String(loanSchemeId).trim()
      };

      const envelope = CoreApi.makeRequestEnvelope(formId, requestData, Environment.appName || "PROJECT_KAIRO");
      envelope.RequestTime = formatRequestTime(new Date());
      envelope.FormId = formId;
      envelope.RequestID = formId;
      envelope.Checksum = "";

      const resp = await CoreApi.post(ENDPOINT, envelope);

      return {
        success: resp?.success !== false,
        status: resp?.Status,
        message: resp?.Message || resp?.message || "",
        details: Array.isArray(resp?.Details) ? resp.Details : null,
        raw: resp
      };
    },

    /**
     * Save Group Member Scheme (Add/Edit)
     * @param {object} params
     * @param {string} params.branchId OurBranchID
     * @param {string} params.clientId ClientID
     * @param {string} params.refId RefID
     * @param {string} params.loanSchemeId LoanSchemeID
     * @param {string} params.loanLevelNo LoanLevelNo
     * @param {string} params.status MemberSchemeStatusID
     * @param {string} params.createdBy CreatedBy
     * @param {string} params.createdOn CreatedOn
     * @param {string} params.modifiedBy ModifiedBy
     * @param {string} params.modifiedOn ModifiedOn
     * @param {string} params.supervisedBy SupervisedBy
     * @param {number} params.updateCount UpdateCount
     * @returns {Promise<object>} Save result with Details array or error Status
     */
    async saveGroupMemberScheme({
      branchId,
      clientId,
      refId,
      loanSchemeId,
      loanLevelNo,
      status,
      createdBy,
      createdOn,
      modifiedBy,
      modifiedOn,
      supervisedBy,
      updateCount
    }) {
      const formId = "dbo.p_AddEditGroupMemberScheme";

      if (!clientId) {
        throw new Error("clientId is required");
      }
      if (!loanSchemeId) {
        throw new Error("loanSchemeId is required");
      }

      const requestData = {
        ClientID: String(clientId).trim(),
        RefID: String(refId ?? "").trim(),
        LoanSchemeID: String(loanSchemeId).trim(),
        LoanLevelNo: String(loanLevelNo ?? "").trim(),
        OurBranchID: String(branchId || Environment.OurBranchID || "").trim(),
        MemberSchemeStatusID: String(status ?? "").trim(),
        CreatedBy: String(createdBy ?? "").trim(),
        CreatedOn: String(createdOn ?? "").trim(),
        ModifiedBy: String(modifiedBy ?? "").trim(),
        ModifiedOn: String(modifiedOn ?? "").trim(),
        SupervisedBy: String(supervisedBy ?? "").trim(),
        UpdateCount: Number(updateCount ?? 1)
      };

      const envelope = CoreApi.makeRequestEnvelope(formId, requestData, Environment.appName || "PROJECT_KAIRO");
      envelope.RequestTime = formatRequestTime(new Date());
      envelope.FormId = formId;
      envelope.RequestID = formId;
      envelope.Checksum = "";

      const resp = await CoreApi.post(ENDPOINT, envelope);

      return {
        success: resp?.success !== false,
        status: resp?.Status,
        message: resp?.Message || resp?.message || "",
        details: Array.isArray(resp?.Details) ? resp.Details : null,
        raw: resp
      };
    }
  };

  global.GroupMemberMaintenanceService = GroupMemberMaintenanceService;
})(window);
