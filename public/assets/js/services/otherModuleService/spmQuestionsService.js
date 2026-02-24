/**
 * SPM Questions Service
 * Handles all API interactions for SPM & Credit Scoring Questions module
 */
(function (global) {
  const CoreApi = global.CoreApi;
  const env = global.Environment || {};
  const BASE_URL = (env.baseUrlOtherModules || env.baseUrlCommon || "http://localhost:8080").replace(/\/+$/, "");

  const getAuthToken = () => {
    try {
      const storageKey = global.CoreBankingConfig?.auth?.storageKey || 'nimble_auth_session';
      const raw = global.localStorage?.getItem?.(storageKey);
      const session = raw ? JSON.parse(raw) : null;
      const token = session?.token || session?.accessToken || session?.AccessToken;
      return token ? String(token) : '';
    } catch (_) {
      return '';
    }
  };

  const getRequestTime = () => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(now.getMonth() + 1)}/${pad(now.getDate())}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  };

  const postOldApi = async (envelope) => {
    const token = getAuthToken();
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    console.log('[SPMQuestionsService] Sending request:', JSON.stringify(envelope, null, 2));
    
    const response = await fetch(`${BASE_URL}/api/OldAPI`, {
      method: 'POST',
      headers,
      body: JSON.stringify(envelope)
    });
    
    const result = await response.json();
    console.log('[SPMQuestionsService] Response:', result);
    return result;
  };

  const SPMQuestionsService = {
    /**
     * Get Questions record
     * @param {Object} params - { QuestionID, Direction, QuestionType }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    getQuestions(params) {
      const envelope = {
        RequestID: "dbo.p_GetQuestions",
        FormId: "dbo.p_GetQuestions",
        RequestData: {
          QuestionID: params.QuestionID || '',
          Direction: params.Direction ?? 0,
          QuestionType: params.QuestionType || ''
        },
        RequestTime: getRequestTime(),
        AppName: "PROJECT_KAIRO",
        Checksum: ""
      };
      return postOldApi(envelope);
    },

    /**
     * Save (Create/Update) Questions
     * @param {Object} params - { DetailRecords (xml) }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    saveQuestions(params) {
      const envelope = {
        RequestID: "dbo.p_AddQuestions",
        FormId: "dbo.p_AddQuestions",
        RequestData: {
          DetailRecords: params.DetailRecords || ''
        },
        RequestTime: getRequestTime(),
        AppName: "PROJECT_KAIRO",
        Checksum: ""
      };
      return postOldApi(envelope);
    },

    /**
     * Delete Questions
     * @param {Object} params - { QuestionID }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    deleteQuestions(params) {
      console.log('[SPMQuestionsService] deleteQuestions called with:', params);
      const envelope = {
        RequestID: "dbo.p_DeleteQuestions",
        FormId: "dbo.p_DeleteQuestions",
        RequestData: {
          OuestionID: params.QuestionID || ''  // SP has typo - expects "@OuestionID" not "@QuestionID"
        },
        RequestTime: getRequestTime(),
        AppName: "PROJECT_KAIRO",
        Checksum: ""
      };
      console.log('[SPMQuestionsService] Delete envelope:', JSON.stringify(envelope, null, 2));
      return postOldApi(envelope);
    }
  };

  global.SPMQuestionsService = SPMQuestionsService;
})(window);
