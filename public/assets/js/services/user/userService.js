(function (global) {
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};

  if (!CoreApi) {
    console.error("CoreApi is not loaded. Ensure services/shared/coreApi.js is included before userService.js.");
    return;
  }

  // Get base URL from environment
  const USER_BASE_URL = (Environment.baseUrlCommon || "http://localhost:3306").replace(/\/+$/, "");

  const endpoints = {
    getUsers: `${USER_BASE_URL}/api/OldAPI`,
  };

  const UserService = {
    /**
     * Get users
     * @param {object} requestData - { LoginOperatorID, OurBranchID, RequireOperatorID, Direction }
     * @returns {Promise} Normalized response with { success, code, message, data }
     */
    getUsers(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetUsers", requestData);
      return CoreApi.post(endpoints.getUsers, envelope);
    },

    /**
     * Add or edit user
     * @param {object} requestData - User data including OperatorID, EmployeeID, Password, etc.
     * @returns {Promise} Normalized response with { success, code, message, data }
     */
    addEditUser(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_AddEditUsers", requestData);
      return CoreApi.post(endpoints.getUsers, envelope);
    },

    /**
     * Close user
     * @param {object} requestData - { OperatorID, ClosedBy, ClosedDate, ClosedReasonID, ClosedReason, SupervisedBy, NewRecord }
     * @returns {Promise} Normalized response with { success, code, message, data }
     */
    closeUser(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_CloseUser", requestData);
      return CoreApi.post(endpoints.getUsers, envelope);
    },

    /**
     * Get user roles
     * @param {object} requestData - { BankID, OurBranchID, RequireOperatorID, OperatorID }
     * @returns {Promise} Normalized response with { success, code, message, data }
     */
    getUserRoles(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetUserRoles", requestData);
      return CoreApi.post(endpoints.getUsers, envelope);
    },

    /**
     * Get user terminals
     * @param {object} requestData - { OurBranchID, OperatorID, LoginOperatorID }
     * @returns {Promise} Normalized response with { success, code, message, data }
     */
    getUserTerminals(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetUserTerminals", requestData);
      return CoreApi.post(endpoints.getUsers, envelope);
    },

    /**
     * Get roles
     * @param {object} requestData - { OurBranchID, RoleID, Direction }
     * @returns {Promise} Normalized response with { success, code, message, data }
     */
    getRoles(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetRoles", requestData);
      return CoreApi.post(endpoints.getUsers, envelope);
    },

    /**
     * Add or edit user roles
     * @param {object} requestData - { OurBranchID, OperatorID, OperatedBy, OperatedOn, SupervisedBy, UpdateCount, DetailRecords }
     * @returns {Promise} Normalized response with { success, code, message, data }
     */
    addEditUserRoles(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_AddEditUserRoles", requestData);
      return CoreApi.post(endpoints.getUsers, envelope);
    },
  };

  global.UserService = UserService;
  console.log("✅ UserService loaded");
})(window);
