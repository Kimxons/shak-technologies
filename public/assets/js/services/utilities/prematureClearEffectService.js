// Premature Clear Effect Service (Utilities)
(function (global) {
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};
  const BASE_URL = (Environment.baseUrlCommon || "http://localhost:5000").replace(/\/+$/, "");

  const PrematureClearEffectService = {
    /**
     * Get account value dated transactions
     * @param {Object} requestData - { OurBranchID, AccountID, OperatorID }
     * @returns {Promise<Object>} Normalized response with transaction data
     * 
     * Request Format:
     * {
     *   "RequestID": "dbo.p_GetAccountValueDatedTrx",
     *   "FormId": "dbo.p_GetAccountValueDatedTrx",
     *   "RequestData": {
     *     "OurBranchID": "BranchID",
     *     "AccountID": "AccountID",
     *     "OperatorID": "OperatorID"
     *   }
     * }
     * 
     * Response Format:
     * {
     *   "Details": [
     *     {
     *       "OperatorID": "",
     *       "EventID": 0,
     *       "NewData": "",
     *       "CreatedOn": "",
     *       "UpdateCount": 0
     *     }
     *   ],
     *   "Details01": []
     * }
     */
    async getAccountValueDatedTrx(requestData) {
      console.group('🔵 PrematureClearEffectService.getAccountValueDatedTrx');
      console.log('📤 Request Data:', requestData);
      console.log('🌐 API URL:', `${BASE_URL}/api/OldAPI`);
      
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetAccountValueDatedTrx", requestData);
      console.log('📦 Request Envelope:', JSON.stringify(envelope, null, 2));
      
      try {
        const result = await CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
        console.log('📥 Response:', result);
        console.groupEnd();
        return result;
      } catch (error) {
        console.error('❌ Error:', error);
        console.groupEnd();
        throw error;
      }
    },

    /**
     * Edit/Save account value dated transactions
     * @param {Object} requestData - { OurBranchID, CreatedBy, CreatedOn, SupervisedBy, DetailRecords }
     * @returns {Promise<Object>} Normalized response
     * 
     * Request Format:
     * {
     *   "RequestID": "dbo.p_EditAccountValueDatedTrx",
     *   "FormId": "dbo.p_EditAccountValueDatedTrx",
     *   "RequestData": {
     *     "OurBranchID": "BranchID",
     *     "CreatedBy": "OperatorID",
     *     "CreatedOn": "smalldatetime",
     *     "SupervisedBy": "OperatorID",
     *     "DetailRecords": "xml"
     *   }
     * }
     */
    async editAccountValueDatedTrx(requestData) {
      console.group('🔵 PrematureClearEffectService.editAccountValueDatedTrx');
      console.log('📤 Request Data:', requestData);
      console.log('🌐 API URL:', `${BASE_URL}/api/OldAPI`);
      
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_EditAccountValueDatedTrx", requestData);
      console.log('📦 Request Envelope:', JSON.stringify(envelope, null, 2));
      
      try {
        const result = await CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
        console.log('📥 Response:', result);
        console.groupEnd();
        return result;
      } catch (error) {
        console.error('❌ Error:', error);
        console.groupEnd();
        throw error;
      }
    }
  };

  global.PrematureClearEffectService = PrematureClearEffectService;
})(window);
