(function (global) {
  const CoreApi = global.CoreApi;
  const BASE_URL = (global.Environment && global.Environment.baseUrlMicroFinance || "http://localhost:XXXX").replace(/\/+$/, "");
  
  const GroupService = {
    getGroupDetails(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetGroupDetails", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    addEditGroup(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_AddEditGroupDetails", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    getGroupProductMinDetail(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetGroupProductMinDetail", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    // Add other methods for update, delete, etc. as needed
    updateGroup(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_UpdateGroup", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    deleteGroup(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_DeleteGroup", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    deleteGroupDetails(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_DeleteGroupDetails", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    getGroupLoanSchemeCombo(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetGroupLoanSchemeCombo", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    viewGroupMembers(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_ViewGroupMembers", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    getSubGroupDetails(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetSubGroupDetails", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    addEditSubGroup(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_AddEditSubGroup", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    getSubGroup(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetSubGroup", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    deleteSubGroup(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_DeleteSubGroup", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    getGRTDetails(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetGRTDetails", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    addEditGRTDetails(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_AddEditGRTDetails", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    deleteGRTDetails(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_DeleteGRTDetails", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    getUserFieldsData(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetUserFieldsData", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    getGroupBankAccounts(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetGroupBankAccounts", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    searchClearingBanks(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.pc_SearchClearingBanks", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    getBankBranches(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_rw_GetBranches", requestData={});
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    addEditGroupBankAccounts(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_AddEditGroupBankAccounts", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    deleteGroupBankAccounts(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_DeleteGroupBankAccounts", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    checkUserRights(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("p_UserRights", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    getGroupMemberList(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetGroupMemberList", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    changeMemberGroupID(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_ChangeMemberGroupID", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    getGroupLoanInstDateChange(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetGroupLoanInstDateChange", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    /**
     * Get Group Loan Schemes
     * @param {Object} requestData - { BankID, OurBranchID, LoanSchemeID, OperatorID, Direction }
     * @returns {Promise} API response with loan scheme data
     */
    getGroupLoanSchemes(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetGroupLoanSchemes", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    /**
     * Add or Edit Group Loan Schemes
     * @param {Object} requestData - Loan scheme data to add/edit
     * @returns {Promise} API response
     */
    addEditGroupLoanSchemes(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_AddEditGroupLoanSchemes", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    /**
     * Get Group Loan Menu (Products)
     * @param {Object} requestData - { BankID, OurBranchID, LoanSchemeID, LoanCycleNo, LoanLevelNo, EffectiveDate, OperatorID }
     * @returns {Promise} API response with loan menu/products data
     */
    getGroupLoanMenu(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetGroupLoanMenu", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    /**
     * Add or Edit Group Loan Menu
     * @param {Object} requestData - Loan menu data to add/edit
     * @returns {Promise} API response
     */
    addEditGroupLoanMenu(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_AddEditGroupLoanMenu", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    /**
     * Get Group Loan Scheme Products
     * @param {Object} requestData - { BankID, LoanSchemeID, OperatorID }
     * @returns {Promise} API response with products data
     */
    getGroupLoanSchemeProducts(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetGroupLoanSchemeProducts", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    /**
     * Add or Edit Group Loan Scheme Products
     * @param {Object} requestData - Product data to add/edit
     * @returns {Promise} API response
     */
    addEditGroupLoanSchemeProducts(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_AddEditGroupLoanSchemeProducts", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    /**
     * Delete Group Loan Scheme
     * @param {Object} requestData - { BankID, LoanSchemeID, NewRecord }
     * @returns {Promise} API response
     */
    deleteGroupLoanSchemes(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_DeleteGroupLoanSchemes", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    /**
     * Get Interest Menu Combo for dropdown
     * @param {Object} requestData - { BankID, LoanSchemeID }
     * @returns {Promise} API response with interest menu options
     */
    getInterestMenuCombo(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_getInterestmenucombo", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    /**
     * Get SP Condition Class Combo for Group Class dropdown
     * @param {Object} requestData - { BankID, ClasificationType }
     * @returns {Promise} API response with group class options
     */
    getSpConditionClassCombo(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetSpConditionCalssCombo", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    }
  };
  
  global.GroupService = GroupService;
})(window);