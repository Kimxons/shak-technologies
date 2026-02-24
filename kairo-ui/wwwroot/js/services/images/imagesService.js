(function (global) {
    const CoreApi = global.CoreApi;
    const BASE_URL = (Environment.baseUrlCommon || "http://localhost:3306").replace(/\/+$/, "");

    const ImagesService = {
        /**
         * Search for branches
         * @param {Object} requestData - The search criteria
         * @returns {Promise} The API response
         */
        searchBranches(requestData) {
            // "FormId": "dbo.pc_SearchSystemBranches"
            const envelope = CoreApi.makeRequestEnvelope("dbo.pc_SearchSystemBranches", requestData);
            return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
        },

        /**
         * Search for clients
         * @param {Object} requestData - The search criteria
         * @returns {Promise} The API response
         */
        searchClients(requestData) {
            // "FormId": "dbo.p_GetSearchResult"
            const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetSearchResult", requestData);
            return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
        },

        /**
         * Save image data
         * @param {Object} requestData - The image data to save
         * @returns {Promise} The API response
         */
        saveImage(requestData) {
            // "FormId": "dbo.p_AddImageTemp"
            const envelope = CoreApi.makeRequestEnvelope("dbo.p_AddImageTemp", requestData);
            return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
        },

        /**
         * Get list of temp images
         * @param {Object} requestData
         * @returns {Promise}
         */
        getTempImageList(requestData) {
            const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetImageTempList", requestData);
            return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
        },

        /**
         * Get single temp image content
         * @param {Object} requestData - Expects { TempImagesID: ... }
         * @returns {Promise}
         */
        getTempImageOnly(requestData) {
            const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetImageTempIOnly", requestData);
            return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
        },

        /**
         * Delete temp image
         * @param {Object} requestData - Expects { TempImagesID: ... }
         * @returns {Promise}
         */
        deleteImageTemp(requestData) {
            const envelope = CoreApi.makeRequestEnvelope("dbo.p_DeleteImageTemp", requestData);
            return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
        },

        /**
         * Supervise image
         * @param {Object} requestData
         * @returns {Promise}
         */
        superviseImage(requestData) {
            const envelope = CoreApi.makeRequestEnvelope("dbo.p_SuperviseImageAccounts", requestData);
            return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
        }
    };

    global.ImagesService = ImagesService;
})(window);
