(function (global) {
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};

  const BASE_URL = (Environment.baseUrlAccount || Environment.baseUrlCommon || "http://localhost:XXXX").replace(/\/+$/, "");
  const DOCUMENT_ENDPOINT = `${BASE_URL}/api/OldAPI`;

  const DocumentService = {
    /**
     * Search for documents
     * @param {object} requestData - Search parameters (TableID, WhereStmt, etc.)
     * @returns {Promise} Response from GetSystemSearchResult
     */
    searchDocuments(requestData) {
      const formId = "p_GetSearchResult";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(DOCUMENT_ENDPOINT, envelope);
    },

    /**
     * Get document details
     * @param {object} requestData - Document ID and related parameters
     * @returns {Promise} Document details
     */
    getDocument(requestData) {
      const formId = "dbo.p_GetAccountDocuments";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(DOCUMENT_ENDPOINT, envelope);
    },

    /**
     * Add or edit document
     * @param {object} requestData - Document data to save
     * @returns {Promise} Save result
     */
    addEditDocument(requestData) {
      const formId = "dbo.p_AddEditAccountDocuments";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(DOCUMENT_ENDPOINT, envelope);
    }
  };

  global.DocumentService = DocumentService;
})(window);
