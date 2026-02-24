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
     * @param {Object} requestData - { SearchKey, TableID, WhereStmt, RefID, PrevOrNext, AdvFilterString, OperatorID, ModuleID, OurBranchID, LanguageID }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    getQuestionnaires(requestData) {
      const params = {};
      
      // Include other parameters if they have values, otherwise set to null
      params.WhereStmt = requestData.WhereStmt || '';
      params.TableID = requestData.TableID || '';
      params.RefID = requestData.RefID || null;
      params.PrevOrNext = requestData.PrevOrNext || 0;
      params.AdvFilterString = requestData.AdvFilterString || '';
      params.OperatorID = requestData.OperatorID || '';
      params.ModuleID = requestData.ModuleID || '';
      params.OurBranchID = requestData.OurBranchID || '';
      params.SearchKey = requestData.SearchKey || null;
      params.LanguageID = requestData.LanguageID || 'en';
      
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetSearchResult", params);
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
        QuestionairreID: requestData.QuestionnaireID || '',
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
        QuestionairreID: requestData.QuestionnaireID || ''
      });
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Get Questions by Type
     * @param {string} questionType - The question type
     * @param {number} direction - Direction parameter
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    getQuestionsByType(questionType, direction) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetQuestionsByType", {
        QuestionType: questionType || '',
        Direction: direction ?? 0
      });
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Get ID Description for Workflow ID based on Product ID
     * @param {Object} requestData - { ID: productId }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    getIDDescription(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetIDDescription", {
        OurBranchID: '0101',
        ControlTypeID: 'ProductWorkflowID',
        ID: requestData.ID || '',
        BankID: '00',
        TypeID: 'ProductWorkflowID',
        AdvanceFilter: null,
        LanguageID: 'en'
      });
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Get Questionnaire Details for auto-population
     * @param {Object} requestData - { QuestionnaireID, Direction, ProductID, WorkFlowID, StageID, QuestionaireTypeID }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    getQuestionnaireDetails(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetQuestionnaire", {
        QuestionnaireID: requestData.QuestionnaireID || '',
        Direction: requestData.Direction || 0,
        ProductID: requestData.ProductID || '',
        WorkFlowID: requestData.WorkFlowID || '',
        StageID: requestData.StageID || '',
        QuestionaireTypeID: requestData.QuestionaireTypeID || ''
      });
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Get Questions for grid population
     * @param {Object} requestData - { QuestionID, Direction, QuestionType }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    getQuestions(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetQuestions", {
        QuestionID: requestData.QuestionID || '',
        Direction: requestData.Direction || 0,
        QuestionType: requestData.QuestionType || ''
      });
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    }
  };

  global.SPMQuestionnairesService = SPMQuestionnairesService;
})(window);
