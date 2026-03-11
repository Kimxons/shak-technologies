(function (global) {
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};

  const BASE_URL = (Environment.baseUrlCommon || Environment.baseUrlOtherModules || "").replace(/\/+$/, "");
  const ENDPOINT = `${BASE_URL}/api/OldAPI`;

  const AccountUtilitiesService = {
    /**
     * Get Standing Instruction Types
     * @param {Object} requestData - { BankID, OurBranchID, SITypeID, OperatorID, Direction }
     * @returns {Promise} API response with SI Type records
     */
    getSITypes(requestData) {
      const formId = "dbo.p_GetSITypes";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ENDPOINT, envelope);
    },

    /**
     * Add or Edit a Standing Instruction Type
     * @param {Object} requestData - SI Type fields + NewRecord (1=Add, 0=Edit)
     * @returns {Promise} API response
     */
    addEditSIType(requestData) {
      const formId = "dbo.p_AddEditSITypes";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ENDPOINT, envelope);
    }
  };

  global.AccountUtilitiesService = AccountUtilitiesService;
})(window);
