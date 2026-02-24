(function (global) {
  const CoreApi = global.CoreApi;
  const BASE_URL = (global.Environment?.baseUrlMicroFinance || "http://localhost:XXXX").replace(/\/+$|\s+$/g, "");

  const formatRequestTime = (date = new Date()) => {
    const pad2 = (n) => String(n).padStart(2, '0');
    const mm = pad2(date.getMonth() + 1);
    const dd = pad2(date.getDate());
    const yyyy = date.getFullYear();
    const hh = pad2(date.getHours());
    const min = pad2(date.getMinutes());
    const ss = pad2(date.getSeconds());
    return `${mm}/${dd}/${yyyy} ${hh}:${min}:${ss}`;
  };

  const PROC_GET_EXIT_TRX = 'dbo.p_GetExitTrx';
  const APP_NAME = 'PROJECT_KAIRO';

  const ExitProcessService = {
    /**
     * Get Exit Trx/Details
     * @param {Object} requestData - matches RequestData for dbo.p_GetExitTrx
     */
    getExitTrx(requestData) {
      const envelope = {
        RequestID: PROC_GET_EXIT_TRX,
        FormId: PROC_GET_EXIT_TRX,
        RequestData: requestData || {},
        RequestTime: formatRequestTime(),
        AppName: APP_NAME,
        Checksum: ""
      };
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    // Backward-compat alias (older page code calls this)
    getClientExitDetails(requestData) {
      return this.getExitTrx(requestData);
    }
  };

  global.ExitProcessService = ExitProcessService;
})(window);
