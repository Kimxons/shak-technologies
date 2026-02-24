(function (global) {
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};

  const BASE_URL = (Environment.baseUrlAccount || Environment.baseUrlCommon || "http://localhost:XXXX").replace(/\/+$/, "");
  const CHEQUEBOOK_ENDPOINT = `${BASE_URL}/api/OldAPI`;

  /**
   * ChequeBookService - Handles all cheque book related API operations
   */
  const ChequeBookService = {
    /**
     * Get cheque book requests for an account
     * @param {Object} requestData - {
     *   OurBranchID: string,
     *   AccountTypeID: string,
     *   AccountID: string,
     *   ChequeRequestsID: string (optional - empty for all),
     *   OperatorID: string,
     *   Direction: number (0=exact, 1=forward/all, -1=backward)
     * }
     * @returns {Promise} API response with cheque book requests
     */
    getChequeBookRequests(requestData) {
      const formId = "dbo.p_GetChequeBookRequests";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(CHEQUEBOOK_ENDPOINT, envelope);
    },

    /**
     * Add or edit cheque book request
     * @param {Object} requestData - Cheque book request data
     * @returns {Promise} API response
     */
    addEditChequeBookRequests(requestData) {
      const formId = "dbo.p_AddEditChequeBookRequests";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(CHEQUEBOOK_ENDPOINT, envelope);
    },

    /**
     * Get cheque books for an account
     * @param {Object} requestData - {
     *   OurBranchID: string (BranchID),
     *   AccountTypeID: string (SystemSubID),
     *   AccountID: string,
     *   RequestReferenceNo: string (optional - empty for all),
     *   OperatorID: string,
     *   Direction: number (smallint: 0=exact, 1=forward/all, -1=backward)
     * }
     * @returns {Promise} API response with cheque books
     */
    getChequeBooks(requestData) {
      const formId = "dbo.p_GetChequeBooks";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(CHEQUEBOOK_ENDPOINT, envelope);
    },

    /**
     * Approve cheque book request
     * @param {Object} requestData - Approval data
     * @returns {Promise} API response
     */
    approveChequeBookRequest(requestData) {
      const formId = "dbo.p_ApproveChequeBookRequest";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(CHEQUEBOOK_ENDPOINT, envelope);
    },

    /**
     * Dispatch cheque book
     * @param {Object} requestData - Dispatch data
     * @returns {Promise} API response
     */
    dispatchChequeBook(requestData) {
      const formId = "dbo.p_DispatchChequeBook";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(CHEQUEBOOK_ENDPOINT, envelope);
    }
  };

  global.ChequeBookService = ChequeBookService;
})(window);
