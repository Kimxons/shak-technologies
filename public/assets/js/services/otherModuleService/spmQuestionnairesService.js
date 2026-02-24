/**
 * SPM Questionnaires Service
 * Handles all API interactions for SPM Questionnaires module
 */
(function (global) {
  const CoreApi = global.CoreApi;
  const env = global.Environment || {};
  const BASE_URL = (env.baseUrlOtherModules || env.baseUrlCommon || "http://localhost:8080").replace(/\/+$/, "");

  const SPMQuestionnairesService = {
    /**
     * Get Questionnaires record
     * @param {Object} requestData - { QuestionnaireID, ProductID, WorkFlowID, StageID, QuestionaireTypeID, Direction }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    getQuestionnaires(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetQuestionnaire", {
        QuestionnaireID: requestData.QuestionnaireID || '',
        ProductID: requestData.ProductID || '',
        WorkFlowID: requestData.WorkFlowID || '',
        StageID: requestData.StageID || '',
        QuestionaireTypeID: requestData.QuestionaireTypeID || '',
        Direction: requestData.Direction ?? 0
      });
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Save (Create/Update) Questionnaires
     * @param {Object} requestData - Questionnaire data
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    saveQuestionnaires(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_AddQuestionnaires", {
        ModuleID: requestData.ModuleID || '',
        DetailRecords: requestData.DetailRecords || '',
        ProductID: requestData.ProductID || '',
        WorkFlowID: requestData.WorkFlowID || '',
        StageID: requestData.StageID || '',
        Formula: requestData.Formula || '',
        RiskAcceptanceID: requestData.RiskAcceptanceID || '',
        QuestionaireTypeID: requestData.QuestionaireTypeID || ''
      });
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Delete Questionnaires
     * @param {Object} requestData - { QuestionnaireID, OperatorID }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    deleteQuestionnaires(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_DeleteQuestionnaires", {
        QuestionnaireID: requestData.QuestionnaireID || '',
        OperatorID: requestData.OperatorID || ''
      });
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Get Question Types for dropdown
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    getQuestionTypes() {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetQuestionTypes", {});
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Get Questions for questionnaire
     * @param {Object} requestData - { QuestionnaireID }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    getQuestionnaireQuestions(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetQuestionnaireQuestions", {
        QuestionnaireID: requestData.QuestionnaireID || ''
      });
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    }
  };

  global.SPMQuestionnairesService = SPMQuestionnairesService;
})(window);
