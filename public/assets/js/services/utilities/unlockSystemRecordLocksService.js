// Unlock System Record Locks Service
(function (global) {
  const CoreApi = global.CoreApi;
  const BASE_URL = (Environment.baseUrlCommon || "http://localhost:5000").replace(/\/+$/, "");

  const UnlockSystemRecordLocksService = {
    /**
     * Get system record locks for a specific branch
     * @param {Object} requestData - { OurBranchID, AccountID }
     * @returns {Promise<Object>} Normalized response with locked records
     */
    getSystemRecordLocks(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetSystemRecordLocks", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Delete/unlock a specific record lock
     * @param {Object} requestData - { LockID, OurBranchID, etc. }
     * @returns {Promise<Object>} Normalized response
     */
    deleteRecordLock(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_DeleteSystemRecordLock", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Delete multiple record locks
     * @param {Object} requestData - { LockIDs[], OurBranchID }
     * @returns {Promise<Object>} Normalized response
     */
    deleteMultipleRecordLocks(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_DeleteMultipleSystemRecordLocks", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    }
  };

  global.UnlockSystemRecordLocksService = UnlockSystemRecordLocksService;
})(window);
