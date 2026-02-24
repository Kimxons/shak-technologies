/**
 * Client Approval Service
 * Handles approval and rejection of clients after final save
 * @module services/client/clientApprovalService
 */
(function (global) {
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};

  if (!CoreApi) {
    console.error("[ClientApprovalService] CoreApi is not loaded. Ensure coreApi.js is loaded first.");
    return;
  }

  // Get base URL from environment
  const BASE_URL = (Environment.baseUrlClient || "http://localhost:6902").replace(/\/+$/, "");
  const API_ENDPOINT = `${BASE_URL}/api/OldAPI`;

  const ClientApprovalService = {
    /**
     * Get list of clients pending approval
     * @param {object} params - Filter parameters
     * @param {string} params.OurBranchID - Branch ID
     * @param {string} params.LogInBranchID - Login Branch ID
     * @param {string} params.GroupID - Group ID (optional)
     * @param {string} params.OperatorID - Operator ID
     * @param {string} params.ClientTypeID - Client Type (I=Individual, B=Business, C=Corporate)
     * @param {string} params.ClientID - Client ID filter (optional)
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    async getGroupClientApproval(params) {
      try {
        const {
          OurBranchID,
          LogInBranchID,
          GroupID = "",
          OperatorID,
          ClientTypeID = "I",
          ClientID = ""
        } = params;

        if (!OurBranchID || !LogInBranchID || !OperatorID) {
          console.warn("[ClientApprovalService] Missing required parameters for getGroupClientApproval");
          return {
            success: false,
            code: "INVALID_PARAMS",
            message: "OurBranchID, LogInBranchID, and OperatorID are required",
            data: null
          };
        }

        const requestData = {
          OurBranchID,
          LogInBranchID,
          GroupID,
          OperatorID,
          ClientTypeID,
          ClientID
        };

        const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetGroupClientApproval", requestData);
        const result = await CoreApi.post(API_ENDPOINT, envelope);

        console.log(`[ClientApprovalService] Retrieved pending approvals`);
        return result;
      } catch (error) {
        console.error("[ClientApprovalService] Error getting group client approval:", error);
        return {
          success: false,
          code: "ERROR",
          message: error.message || "Failed to get pending approvals",
          data: null
        };
      }
    },

    /**
     * Approve multiple clients (batch approval)
     * @param {object} params - Approval parameters
     * @param {string} params.OurBranchID - Branch ID
     * @param {string} params.ApprovedBy - Operator ID performing approval
     * @param {string} params.ApprovedOn - Approval timestamp
     * @param {string} params.DetailRecords - XML string of client IDs to approve
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    async groupClientApproval(params) {
      try {
        const { OurBranchID, ApprovedBy, ApprovedOn, DetailRecords } = params;

        if (!OurBranchID || !ApprovedBy || !DetailRecords) {
          console.warn("[ClientApprovalService] Missing required parameters for groupClientApproval");
          return {
            success: false,
            code: "INVALID_PARAMS",
            message: "OurBranchID, ApprovedBy, and DetailRecords are required",
            data: null
          };
        }

        const requestData = {
          OurBranchID,
          ApprovedBy,
          ApprovedOn: ApprovedOn || new Date().toLocaleString("en-US"),
          DetailRecords
        };

        const envelope = CoreApi.makeRequestEnvelope("dbo.p_GroupClientApproval", requestData);
        const result = await CoreApi.post(API_ENDPOINT, envelope);

        console.log(`[ClientApprovalService] Group approval completed`);
        return result;
      } catch (error) {
        console.error("[ClientApprovalService] Error in group client approval:", error);
        return {
          success: false,
          code: "ERROR",
          message: error.message || "Failed to approve clients",
          data: null
        };
      }
    },

    /**
     * Reject multiple clients (batch rejection)
     * @param {object} params - Rejection parameters
     * @param {string} params.OurBranchID - Branch ID
     * @param {string} params.RejectedReason - Rejection remarks
     * @param {string} params.RejectedBy - Operator ID performing rejection
     * @param {string} params.DetailRecords - XML string of client IDs to reject
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    async groupClientReject(params) {
      try {
        const { OurBranchID, RejectedReason, RejectedBy, DetailRecords } = params;

        if (!OurBranchID || !RejectedReason || !RejectedBy || !DetailRecords) {
          console.warn("[ClientApprovalService] Missing required parameters for groupClientReject");
          return {
            success: false,
            code: "INVALID_PARAMS",
            message: "All parameters are required for rejection",
            data: null
          };
        }

        const requestData = {
          OurBranchID,
          RejectedReason,
          RejectedBy,
          DetailRecords
        };

        const envelope = CoreApi.makeRequestEnvelope("dbo.p_GroupClientReject", requestData);
        const result = await CoreApi.post(API_ENDPOINT, envelope);

        console.log(`[ClientApprovalService] Group rejection completed`);
        return result;
      } catch (error) {
        console.error("[ClientApprovalService] Error in group client rejection:", error);
        return {
          success: false,
          code: "ERROR",
          message: error.message || "Failed to reject clients",
          data: null
        };
      }
    },

    /**
     * Add client to supervision queue (called after successful approval)
     * @param {object} params - Supervision data
     * @param {string} params.OurBranchID - Branch ID
     * @param {string} params.ModuleID - Module ID (e.g., "6961")
     * @param {string} params.LockModuleID - Lock Module ID
     * @param {string} params.OperatorID - Operator ID
     * @param {string} params.Searchkey - Search key
     * @param {string} params.LockKey - Lock key
     * @param {string} params.EventID - Event ID
     * @param {string} params.NewData - New data
     * @param {string} params.OldData - Old data
     * @param {string} params.Remarks - Remarks
     * @param {string} params.NewRecord - New record flag
     * @param {string} params.IPAddress - IP address
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    async addClientSupervisionData(params) {
      try {
        const {
          OurBranchID,
          ModuleID = "6961",
          LockModuleID = "",
          OperatorID,
          Searchkey = "",
          LockKey = "",
          EventID = "",
          NewData = "",
          OldData = "",
          Remarks = "",
          NewRecord = "",
          IPAddress = ""
        } = params;

        if (!OurBranchID || !OperatorID) {
          console.warn("[ClientApprovalService] Missing required parameters for addClientSupervisionData");
          return {
            success: false,
            code: "INVALID_PARAMS",
            message: "OurBranchID and OperatorID are required",
            data: null
          };
        }

        const requestData = {
          OurBranchID,
          ModuleID,
          LockModuleID,
          OperatorID,
          Searchkey,
          LockKey,
          EventID,
          NewData,
          OldData,
          Remarks,
          NewRecord,
          IPAddress
        };

        const envelope = CoreApi.makeRequestEnvelope("dbo.p_AddClientSupervisionData", requestData);
        const result = await CoreApi.post(API_ENDPOINT, envelope);

        console.log(`[ClientApprovalService] Added to supervision queue`);
        return result;
      } catch (error) {
        console.error("[ClientApprovalService] Error adding to supervision:", error);
        return {
          success: false,
          code: "ERROR",
          message: error.message || "Failed to add to supervision",
          data: null
        };
      }
    },

    /**
     * Get list of clients pending supervision
     * @param {object} params - Filter parameters
     * @param {string} params.OurBranchID - Branch ID
     * @param {string} params.ModuleID - Module ID (e.g., "6961")
     * @param {string} params.OperatorID - Operator ID
     * @param {string} params.Searchkey - Search key/filter
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    async getClientSupervisionList(params) {
      try {
        const {
          OurBranchID,
          ModuleID = "6961",
          OperatorID,
          Searchkey = ""
        } = params;

        if (!OurBranchID || !OperatorID) {
          console.warn("[ClientApprovalService] Missing required parameters for getClientSupervisionList");
          return {
            success: false,
            code: "INVALID_PARAMS",
            message: "OurBranchID and OperatorID are required",
            data: null
          };
        }

        const requestData = {
          OurBranchID,
          ModuleID,
          OperatorID,
          Searchkey
        };

        const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetClientSupervisionData", requestData);
        const result = await CoreApi.post(API_ENDPOINT, envelope);

        console.log(`[ClientApprovalService] Retrieved supervision list`);
        return result;
      } catch (error) {
        console.error("[ClientApprovalService] Error getting supervision list:", error);
        return {
          success: false,
          code: "ERROR",
          message: error.message || "Failed to get supervision list",
          data: null
        };
      }
    },

    /**
     * Approve/Close client supervision
     * @param {object} params - Supervision approval parameters
     * @param {string} params.OurBranchID - Branch ID
     * @param {string} params.ModuleID - Module ID (e.g., "6961")
     * @param {string} params.OperatorID - Operator ID
     * @param {string} params.Searchkey - Client ID or search key
     * @param {string} params.Remarks - Approval remarks
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    async approveClientSupervision(params) {
      try {
        const {
          OurBranchID,
          ModuleID = "6961",
          OperatorID,
          Searchkey,
          Remarks = "Supervision approved"
        } = params;

        if (!OurBranchID || !OperatorID || !Searchkey) {
          console.warn("[ClientApprovalService] Missing required parameters for approveClientSupervision");
          return {
            success: false,
            code: "INVALID_PARAMS",
            message: "OurBranchID, OperatorID, and Searchkey are required",
            data: null
          };
        }

        const requestData = {
          OurBranchID,
          ModuleID,
          OperatorID,
          Searchkey,
          Remarks
        };

        const envelope = CoreApi.makeRequestEnvelope("dbo.p_ApproveClientSupervision", requestData);
        const result = await CoreApi.post(API_ENDPOINT, envelope);

        console.log(`[ClientApprovalService] Approved supervision for ${Searchkey}`);
        return result;
      } catch (error) {
        console.error("[ClientApprovalService] Error approving supervision:", error);
        return {
          success: false,
          code: "ERROR",
          message: error.message || "Failed to approve supervision",
          data: null
        };
      }
    },

    /**
     * Reject/Close client supervision
     * @param {object} params - Supervision rejection parameters
     * @param {string} params.OurBranchID - Branch ID
     * @param {string} params.ModuleID - Module ID (e.g., "6961")
     * @param {string} params.OperatorID - Operator ID
     * @param {string} params.Searchkey - Client ID or search key
     * @param {string} params.Remarks - Rejection remarks
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    async rejectClientSupervision(params) {
      try {
        const {
          OurBranchID,
          ModuleID = "6961",
          OperatorID,
          Searchkey,
          Remarks
        } = params;

        if (!OurBranchID || !OperatorID || !Searchkey || !Remarks) {
          console.warn("[ClientApprovalService] Missing required parameters for rejectClientSupervision");
          return {
            success: false,
            code: "INVALID_PARAMS",
            message: "OurBranchID, OperatorID, Searchkey, and Remarks are required",
            data: null
          };
        }

        const requestData = {
          OurBranchID,
          ModuleID,
          OperatorID,
          Searchkey,
          Remarks
        };

        const envelope = CoreApi.makeRequestEnvelope("dbo.p_RejectClientSupervision", requestData);
        const result = await CoreApi.post(API_ENDPOINT, envelope);

        console.log(`[ClientApprovalService] Rejected supervision for ${Searchkey}`);
        return result;
      } catch (error) {
        console.error("[ClientApprovalService] Error rejecting supervision:", error);
        return {
          success: false,
          code: "ERROR",
          message: error.message || "Failed to reject supervision",
          data: null
        };
      }
    },

    /**
     * Approve a client
     * @param {object} params - Approval parameters
     * @param {string} params.RequestID - Request ID
     * @param {string} params.ClientID - Client ID to approve
     * @param {string} params.ApprovedBy - Operator ID performing approval
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    async approveClient(params) {
      try {
        const { RequestID, ClientID, ApprovedBy } = params;

        if (!ClientID || !ApprovedBy) {
          console.warn("[ClientApprovalService] Missing required parameters for approveClient");
          return {
            success: false,
            code: "INVALID_PARAMS",
            message: "ClientID and ApprovedBy are required",
            data: null
          };
        }

        const requestData = {
          RequestID: RequestID || "",
          ClientID,
          ApprovedBy
        };

        const envelope = CoreApi.makeRequestEnvelope("p_v1_ApproveClient", requestData);
        const result = await CoreApi.post(API_ENDPOINT, envelope);

        console.log(`[ClientApprovalService] Approved client: ${ClientID}`);
        return result;
      } catch (error) {
        console.error("[ClientApprovalService] Error approving client:", error);
        return {
          success: false,
          code: "ERROR",
          message: error.message || "Failed to approve client",
          data: null
        };
      }
    },

    /**
     * Reject a client
     * @param {object} params - Rejection parameters
     * @param {string} params.RequestID - Request ID
     * @param {string} params.ClientID - Client ID to reject
     * @param {string} params.WFStageID - Workflow stage ID
     * @param {string} params.RejectRemarks - Rejection remarks/reason
     * @param {string} params.RejectedBy - Operator ID performing rejection
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    async rejectClient(params) {
      try {
        const { RequestID, ClientID, WFStageID, RejectRemarks, RejectedBy } = params;

        if (!ClientID || !RejectRemarks || !RejectedBy) {
          console.warn("[ClientApprovalService] Missing required parameters for rejectClient");
          return {
            success: false,
            code: "INVALID_PARAMS",
            message: "ClientID, RejectRemarks, and RejectedBy are required",
            data: null
          };
        }

        const requestData = {
          RequestID: RequestID || "",
          ClientID,
          WFStageID: WFStageID || "",
          RejectRemarks,
          RejectedBy
        };

        const envelope = CoreApi.makeRequestEnvelope("p_v1_RejectClient", requestData);
        const result = await CoreApi.post(API_ENDPOINT, envelope);

        console.log(`[ClientApprovalService] Rejected client: ${ClientID}`);
        return result;
      } catch (error) {
        console.error("[ClientApprovalService] Error rejecting client:", error);
        return {
          success: false,
          code: "ERROR",
          message: error.message || "Failed to reject client",
          data: null
        };
      }
    }
  };

  // Export to global scope
  global.ClientApprovalService = ClientApprovalService;

  console.log("[ClientApprovalService] Service initialized");
})(window);
