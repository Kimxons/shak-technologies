/**
 * Voucher Format Service
 * Handles CRUD operations for voucher printing formats
 */
(function (global) {
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};
  const BASE_URL = (Environment.baseUrlCommon || "http://localhost:5000").replace(/\/+$/, "");
  const ENDPOINT = `${BASE_URL}/api/OldAPI`;

  const VoucherFormatService = {
    /**
     * Get voucher formats
     * @param {Object} requestData - { BankID, OurBranchID, FormatID, OperatorID }
     * @returns {Promise<Object>} Normalized response with voucher formats
     */
    getVoucherFormats(requestData) {
      const formId = "dbo.p_GetVoucherFormats";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      console.log('[VoucherFormatService] getVoucherFormats request:', requestData);
      return CoreApi.post(ENDPOINT, envelope);
    },

    /**
     * Edit/Save voucher format
     * @param {Object} requestData - {
     *   BankID, FormatID, FormatName, VoucherFormatTypeID, VoucherFormat,
     *   ModifiedBy, ModifiedOn, SupervisedBy, UpdateCount
     * }
     * @returns {Promise<Object>} Normalized response
     */
    editVoucherFormat(requestData) {
      const formId = "dbo.p_EditVoucherFormats";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      console.log('[VoucherFormatService] editVoucherFormat request:', requestData);
      return CoreApi.post(ENDPOINT, envelope);
    }
  };

  // Export to global scope
  global.VoucherFormatService = VoucherFormatService;
})(window);
