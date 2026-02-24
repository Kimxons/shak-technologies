/**
 * Account Cancel Stop Payment Service
 * Handles API calls for cancel stop payment operations
 */
(function (global) {
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};

  const BASE_URL = (Environment.baseUrlCommon || "http://localhost:5000").replace(/\/+$/, "");
  const ENDPOINT = `${BASE_URL}/api/OldAPI`;

  const AccountCancelStopPaymentService = {
    getCancelStopPayments(requestData) {
      const formId = "dbo.p_GetCancelStopPayments";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ENDPOINT, envelope);
    },

    addEditCancelStopPayment(requestData) {
      const formId = "dbo.p_AddEditCancelStopPayments";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ENDPOINT, envelope);
    },

    deleteCancelStopPayment(requestData) {
      const formId = "dbo.p_DeleteCancelStopPayment";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ENDPOINT, envelope);
    }
  };

  // Expose to global scope
  global.AccountCancelStopPaymentService = AccountCancelStopPaymentService;

})(window);
