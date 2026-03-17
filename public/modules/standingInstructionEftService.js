/**
 * Standing Instruction EFT Service
 * Handles API interactions for Standing Instruction EFT module
 */
(function (global) {
  const CoreApi = global.CoreApi;
  const BASE_URL = (
    Environment.baseUrlAccount ||
    Environment.baseUrlCommon ||
    "http://localhost:5000"
  ).replace(/\/+$/, "");

  const formatRequestTime = (date = new Date()) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  };

  const StandingInstructionEftService = {
    /**
     * Get SI Type combo options
     * @param {Object} requestData - { BankID, ModuleID }
     * @param {string} requestData.BankID - Bank ID (required)
     * @param {string|number} requestData.ModuleID - Module ID (smallint, required)
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    getSITypeCombo(requestData) {
      const envelope = {
        RequestID: "dbo.p_getsitYPEcombo",
        FormId: "dbo.p_getsitYPEcombo",
        RequestData: requestData,
        RequestTime: formatRequestTime(new Date()),
        AppName: "PROJECT_KAIRO",
        Checksum: ""
      };
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    }
  };

  global.StandingInstructionEftService = StandingInstructionEftService;
})(window);
