(function (global) {
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};

  if (!CoreApi) {
    console.error("CoreApi is not loaded. Ensure services/shared/coreApi.js is included before roleService.js.");
    return;
  }

  // Get base URL from environment
  const ROLE_BASE_URL = (Environment.baseUrlCommon || "http://localhost:3306").replace(/\/+$/, "");

  const endpoints = {
    getRoles: `${ROLE_BASE_URL}/api/OldAPI`,
  };

  const RoleService = {
    /**
     * Get roles
     * @param {object} requestData - { RoleID, OurBranchID, OperatorID, Direction }
     * @returns {Promise} Normalized response with { success, code, message, data }
     */
    getRoles(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetRoles", requestData);
      return CoreApi.post(endpoints.getRoles, envelope);
    },

    /**
     * Add or edit role
     * @param {object} requestData - Role data including RoleID, RoleName, AccessLevel, etc.
     * @returns {Promise} Normalized response with { success, code, message, data }
     */
    addEditRole(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_AddEditRoles", requestData);
      return CoreApi.post(endpoints.getRoles, envelope);
    },

    /**
     * Close role
     * @param {object} requestData - { RoleID, ClosedBy, ClosedDate, ClosedReasonID, ClosedReason, SupervisedBy, NewRecord }
     * @returns {Promise} Normalized response with { success, code, message, data }
     */
    closeRole(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_CloseRole", requestData);
      return CoreApi.post(endpoints.getRoles, envelope);
    },

    /**
     * Get role modules (access rights)
     * @param {object} requestData - { RoleID, OurBranchID, OperatorID }
     * @returns {Promise} Normalized response with { success, code, message, data }
     */
    getRoleModules(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetRoleModules", requestData);
      return CoreApi.post(endpoints.getRoles, envelope);
    },

    /**
     * Get role advance workflow rights
     * @param {object} requestData - { RoleID, OurBranchID, OperatorID }
     * @returns {Promise} Normalized response with { success, code, message, data }
     */
    getRoleAdvanceWFRights(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetWFAdvRoleRights", requestData);
      return CoreApi.post(endpoints.getRoles, envelope);
    },

    /**
     * Delete role
     * @param {object} requestData - { RoleID, NewRecord }
     * @returns {Promise} Normalized response with { success, code, message, data }
     */
    deleteRole(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_DeleteRoles", requestData);
      return CoreApi.post(endpoints.getRoles, envelope);
    },

    /**
     * Edit advance workflow role rights
     * @param {object} requestData - { OurBranchID, RoleID, OperatedBy, OperatedOn, SupervisedBy, UpdateCount, DetailRecords }
     * @returns {Promise} Normalized response with { success, code, message, data }
     */
    editAdvanceWFRights(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_EditWFAdvRoleRights", requestData);
      return CoreApi.post(endpoints.getRoles, envelope);
    },
  };

  global.RoleService = RoleService;
  console.log("✅ RoleService loaded");
})(window);